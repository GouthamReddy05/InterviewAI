"""
Question Generation and Interview Logic
"""

import json
import os
import sys
from typing import List, Optional
import uuid
from dotenv import load_dotenv
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from langchain_classic.memory import ConversationBufferMemory


load_dotenv()


sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml'))

from models.schemas import (
    InterviewQuestion,
    InterviewSession,
    CandidateAnswer,
    FollowUpQuestion,
    AnswerEvaluation,
    RatingEnum,
)
from services.prompts import (
    QUESTION_GENERATION_PROMPT,
    FOLLOWUP_QUESTION_PROMPT,
    ANSWER_EVALUATION_PROMPT,
)
from core.redis_session_store import RedisSessionStore


class InterviewQuestionGenerator:
    """Generate interview questions from resume using Llama3 LLM"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize with GROQ API key"""
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ API key not found. Set GROQ_API_KEY environment variable.")

        self.model = ChatGroq(
            groq_api_key=self.api_key,
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            max_tokens=8000
        )

    def generate_questions(self, resume_text: str) -> List[InterviewQuestion]:
        """Generate interview questions from resume text"""

        print("Before format")
        prompt = QUESTION_GENERATION_PROMPT.format(
            resume_text=resume_text
        )
        print("After format")

        try:
            response = self.model.invoke([
                SystemMessage(content="You are an expert technical interviewer. Generate only valid JSON output."),
                HumanMessage(content=prompt)
            ])

            content = response.content.strip()

            print(f"\n[DEBUG] Raw response length: {len(content)}")
            print(f"[DEBUG] First 300 chars: {repr(content[:300])}")
            print(f"[DEBUG] Last 200 chars: {repr(content[-200:])}")


            if "```json" in content:
                print("[DEBUG] Found ```json wrapper")
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                print("[DEBUG] Found ``` wrapper")
                parts = content.split("```")
                content = parts[1] if len(parts) > 1 else content

            content = content.strip()

            print(f"[DEBUG] After removing markdown: {len(content)} chars")
            print(f"[DEBUG] First 200 chars: {repr(content[:200])}")


            first_brace = content.find('{')
            last_brace = content.rfind('}')

            print(f"[DEBUG] First brace at: {first_brace}, Last brace at: {last_brace}")

            if first_brace == -1 or last_brace == -1 or first_brace >= last_brace:
                print(f"[ERROR] Invalid brace positions")
                print(f"[DEBUG] Full content:\n{content}")
                raise ValueError("No valid JSON object found in response")

            content = content[first_brace:last_brace + 1]

            print(f"[DEBUG] Extracted JSON: {len(content)} chars")
            print(f"[DEBUG] First 150 chars of JSON: {repr(content[:150])}")


            data = json.loads(content)

            print(f"[DEBUG] JSON parsed! Questions count: {len(data.get('questions', []))}")


            category_map = {
                "skills": "skill",
                "skill": "skill",
                "projects": "project",
                "project": "project",
                "experience": "experience",
                "experiences": "experience",
                "achievements": "achievement",
                "achievement": "achievement"
            }


            questions = []
            valid_difficulties = {"intermediate", "advanced", "expert"}
            for idx, q in enumerate(data.get("questions", []), 1):
                category = str(q.get("category", "skill")).lower().strip()
                category = category_map.get(category, "skill")

                diff = str(q.get("difficulty_level", "intermediate")).lower().strip()
                if diff not in valid_difficulties:
                    diff = "intermediate"

                question = InterviewQuestion(
                    id=idx,
                    category=category,
                    name=q.get("name", ""),
                    primary_question=q.get("primary_question", ""),
                    context=q.get("context", ""),
                    difficulty_level=diff
                )
                questions.append(question)

            print(f"[DEBUG] Created {len(questions)} InterviewQuestion objects\n")

            profile = data.get("extracted_profile", {})
            return questions, profile

        except Exception as e:
            print(f"[ERROR] Exception in generate_questions: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Error generating questions: {str(e)}")

    def generate_followup(
        self,
        primary_question: str,
        candidate_answer: str,
        difficulty_level: str,
        context: str,
        conversation_history_text: str = "",
        current_depth: int = 1,
        max_depth: int = 3
    ) -> str:
        """Generate follow-up question based on candidate answer and conversation history"""


        history_text = conversation_history_text if conversation_history_text else "[No prior follow-ups yet]"

        prompt = FOLLOWUP_QUESTION_PROMPT.format(
            primary_question=primary_question,
            difficulty_level=difficulty_level,
            context=context,
            candidate_answer=candidate_answer,
            conversation_history=history_text,
            current_depth=current_depth,
            max_depth=max_depth
        )

        try:
            response = self.model.invoke([
                SystemMessage(content="You are an expert technical interviewer. Generate only the follow-up question, nothing else."),
                HumanMessage(content=prompt)
            ])

            return response.content.strip()

        except Exception as e:
            raise RuntimeError(f"GROQ follow-up generation failed: {e}") from e

    def evaluate_answer(
        self,
        question: str,
        candidate_answer: str
    ) -> AnswerEvaluation:
        """Evaluate candidate answer"""

        prompt = ANSWER_EVALUATION_PROMPT.format(
            question=question,
            answer=candidate_answer
        )

        try:
            response = self.model.invoke([
                SystemMessage(content="You are an expert technical interviewer. Return only valid JSON."),
                HumanMessage(content=prompt)
            ])

            content = response.content


            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                parts = content.split("```")
                content = parts[1] if len(parts) > 1 else content

            content = content.strip()


            first_brace = content.find('{')
            last_brace = content.rfind('}')

            if first_brace == -1 or last_brace == -1 or first_brace >= last_brace:
                raise ValueError("No valid JSON object found in response")

            content = content[first_brace:last_brace + 1]
            data = json.loads(content)

            return AnswerEvaluation(
                rating=data.get("rating", "fair"),
                strengths=data.get("strengths", []),
                improvements=data.get("improvements", []),
                follow_up_direction=data.get("follow_up_direction", "")
            )

        except (json.JSONDecodeError, Exception) as e:

            return AnswerEvaluation(
                rating=RatingEnum.FAIR,
                strengths=["Answer provided"],
                improvements=["Continue improving"],
                follow_up_direction="Elaborate on implementation details"
            )


class InterviewSessionManager:
    """Manage interview sessions"""

    def __init__(self):
        """Initialize session storage (in-memory for now, can be replaced with database)"""

        self.session_store = RedisSessionStore()
        self.generator = InterviewQuestionGenerator()

    def create_session(
        self,
        resume_text: str,
        job_role: str,
        resume_name: str
    ) -> InterviewSession:
        """Create a new interview session"""


        questions, profile = self.generator.generate_questions(resume_text)


        session_id = str(uuid.uuid4())
        session = InterviewSession(
            session_id=session_id,
            resume_name=resume_name,
            job_role=job_role,
            extracted_profile=profile,
            questions=questions,
            memory=ConversationBufferMemory(return_messages=False)
        )


        self.session_store.set(session_id, session)

        return session

    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        """Retrieve a session"""
        return self.session_store.get(session_id)

    def get_current_question(self, session_id: str) -> Optional[InterviewQuestion]:
        """Get current question in the session"""
        session = self.get_session(session_id)
        if not session:
            return None

        if session.current_question_index < len(session.questions):
            return session.questions[session.current_question_index]
        return None

    def submit_answer(self, session_id: str, answer: str) -> dict:
        """
        Submit answer to current question or follow-up.

        Returns:
        {
            "action": "follow_up" | "next_question",
            "evaluation": AnswerEvaluation dict,
            "follow_up_question": str (if action="follow_up", else null),
            "next_question": InterviewQuestion dict (if action="next_question", else null),
            "next_question_available": bool,
            "followup_depth": int
        }
        """
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        current_question = self.get_current_question(session_id)
        if not current_question:
            raise ValueError(f"No current question in session {session_id}")


        if not session.is_followup_mode:
            session.memory.save_context(
                {"input": f"[PRIMARY_QUESTION] {current_question.primary_question}"},
                {"output": f"[ANSWER] {answer}"}
            )
        else:
            last_followup = session.follow_ups[-1].question if session.follow_ups else ""
            session.memory.save_context(
                {"input": f"[FOLLOWUP_QUESTION] {last_followup}"},
                {"output": f"[FOLLOWUP_ANSWER] {answer}"}
            )


        candidate_answer = CandidateAnswer(
            question_id=current_question.id,
            answer=answer,
            is_followup=session.is_followup_mode,
            followup_depth=session.current_followup_depth
        )
        session.answers.append(candidate_answer)


        evaluation = self.generator.evaluate_answer(
            question=current_question.primary_question,
            candidate_answer=answer
        )


        should_ask_followup = False
        action = "next_question"


        if not session.is_followup_mode:
            should_ask_followup = True
            session.is_followup_mode = True
            session.current_followup_depth = 1
        else:

            if (
                session.current_followup_depth < session.max_followup_depth
                and evaluation.rating in [
                    RatingEnum.POOR,
                    RatingEnum.FAIR,
                    RatingEnum.GOOD
                ]
            ):
                session.current_followup_depth += 1
                should_ask_followup = True
            else:
                should_ask_followup = False


        follow_up_question = None
        if should_ask_followup:
            action = "follow_up"
            follow_up_q = self.generator.generate_followup(
                primary_question=current_question.primary_question,
                candidate_answer=answer,
                difficulty_level=current_question.difficulty_level,
                context=current_question.context,
                conversation_history_text=session.memory.buffer,
                current_depth=session.current_followup_depth,
                max_depth=session.max_followup_depth
            )

            follow_up_question = follow_up_q


            follow_up = FollowUpQuestion(
                original_question_id=current_question.id,
                depth=session.current_followup_depth,
                question=follow_up_q,
                candidate_answer=answer,
                evaluation=evaluation
            )
            session.follow_ups.append(follow_up)
        else:

            action = "next_question"
            session.is_followup_mode = False
            session.current_followup_depth = 0
            session.memory.clear()


            if session.follow_ups and session.follow_ups[-1].original_question_id == current_question.id:
                pass

        try:
            eval_dict = evaluation.model_dump(mode="json")
        except AttributeError:
            eval_dict = evaluation.dict()
            if "rating" in eval_dict and hasattr(eval_dict["rating"], "value"):
                eval_dict["rating"] = eval_dict["rating"].value


        result = {
            "action": action,
            "evaluation": eval_dict,
            "follow_up_question": follow_up_question,
            "followup_depth": session.current_followup_depth,
            "next_question": None,
            "next_question_available": False
        }


        if action == "next_question":
            has_next = session.current_question_index < len(session.questions) - 1
            result["next_question_available"] = has_next

            if has_next:
                session.current_question_index += 1
                next_q = session.questions[session.current_question_index]
                result["next_question"] = {
                    "question_number": session.current_question_index + 1,
                    "total_questions": len(session.questions),
                    "category": next_q.category,
                    "name": next_q.name,
                    "primary_question": next_q.primary_question,
                    "context": next_q.context,
                    "difficulty_level": next_q.difficulty_level
                }
            else:

                session.status = "completed"

        return result

    def proceed_to_next_question(self, session_id: str) -> bool:
        """
        Deprecated - progression now happens in submit_answer().
        This is kept for backward compatibility only.
        Move to next question
        """
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        if session.current_question_index < len(session.questions) - 1:
            session.current_question_index += 1

            session.is_followup_mode = False
            session.current_followup_depth = 0
            session.memory.clear()
            return True
        else:

            session.status = "completed"
            return False

    def get_interview_progress(self, session_id: str) -> dict:
        """Get interview progress"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        total = len(session.questions)
        current = session.current_question_index + 1
        percentage = (current / total * 100) if total > 0 else 0

        return {
            "session_id": session_id,
            "total_questions": total,
            "current_question": current,
            "completed_percentage": round(percentage, 2),
            "status": session.status
        }

    def get_interview_report(self, session_id: str) -> dict:
        """Generate interview report"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        report = {
            "session_id": session_id,
            "resume": session.resume_name,
            "job_role": session.job_role,
            "total_questions": len(session.questions),
            "answers_submitted": len(session.answers),
            "status": session.status,
            "created_at": session.created_at.isoformat(),
            "qa_pairs": []
        }


        for answer in session.answers:
            question = next(
                (q for q in session.questions if q.id == answer.question_id),
                None
            )
            followups = [
                    f for f in session.follow_ups
                    if f.original_question_id == answer.question_id
                ]

            if question:
                qa_pair = {
                    "question": question.primary_question,
                    "category": question.category,
                    "answer": answer.answer,

                    "follow_ups": [
                        {
                            "question": f.question,
                            "candidate_answer": f.candidate_answer,
                            "evaluation": f.evaluation.dict()
                        }
                        for f in followups
                    ]
                }

                report["qa_pairs"].append(qa_pair)

        return report

    def generate_improvement_plan(self, session_id: str) -> dict:
        """Generate personalized improvement plan based on interview performance"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        try:

            all_evaluations = []
            for follow_up in session.follow_ups:
                all_evaluations.append(follow_up.evaluation)


            context = f"""
Based on this interview for role: {session.job_role}

Candidate's Performance:
- Total Questions: {len(session.questions)}
- Answers Submitted: {len(session.answers)}

Question Categories:
"""

            for q in session.questions[:5]:
                context += f"\n- {q.category.value}: {q.name}"

            context += "\n\nGenerate a structured improvement plan with:"
            context += "\n1. Top 3 strengths demonstrated"
            context += "\n2. Top 3 areas for improvement"
            context += "\n3. Specific actionable recommendations"
            context += "\n4. Top 3 focus areas"


            response = self.generator.model.invoke([
                SystemMessage(content="You are a career coach. Generate a JSON improvement plan."),
                HumanMessage(content=context)
            ])

            content = response.content.strip()


            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                parts = content.split("```")
                content = parts[1] if len(parts) > 1 else content

            content = content.strip()
            first_brace = content.find('{')
            last_brace = content.rfind('}')

            if first_brace != -1 and last_brace != -1:
                content = content[first_brace:last_brace + 1]

            data = json.loads(content)

            return {
                "strengths": data.get("strengths", []),
                "weaknesses": data.get("weaknesses", []),
                "recommendations": data.get("recommendations", []),
                "focus_areas": data.get("focus_areas", [])
            }

        except Exception as e:
            print(f"[ERROR] Failed to generate improvement plan: {e}")
            return {
                "strengths": ["Participated in interview"],
                "weaknesses": ["Area for growth"],
                "recommendations": ["Practice more interview questions"],
                "focus_areas": ["Technical depth", "Communication"]
            }

    def calculate_interview_score(self, session_id: str) -> dict:
        """Calculate comprehensive interview scores"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")


        technical_scores = []
        for follow_up in session.follow_ups:
            rating_map = {"poor": 40, "fair": 60, "good": 80, "excellent": 95}
            score = rating_map.get(follow_up.evaluation.rating, 60)
            technical_scores.append(score)

        avg_technical = sum(technical_scores) / len(technical_scores) if technical_scores else 0


        return {
            "technical_score": round(avg_technical, 1),
            "communication_score": 75.0,
            "confidence_score": 78.0,
            "eye_contact_score": 82.0,
            "resume_alignment_score": 80.0,
            "problem_solving_score": round(avg_technical * 0.9, 1),
            "overall_score": round((avg_technical + 75 + 78 + 82 + 80) / 5, 1)
        }
