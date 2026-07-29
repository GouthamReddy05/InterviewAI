"""
Question Generation and Interview Logic
"""

import json
import logging
import os
import sys
from typing import List, Optional, Tuple
import uuid
from dotenv import load_dotenv
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq


load_dotenv()

logger = logging.getLogger(__name__)


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
from core.config import MAX_ANSWER_CHARS, MAX_PRIMARY_QUESTIONS


class QuestionGenerationError(RuntimeError):
    """Raised when the LLM cannot produce usable interview questions."""


RATING_TO_SCORE = {
    "poor": 40.0,
    "fair": 60.0,
    "good": 80.0,
    "excellent": 95.0,
}

# Frontend uses a 0–10 scale; LLM score is expected on 1–10.
RATING_TO_SCORE_10 = {
    "poor": 4.0,
    "fair": 6.0,
    "good": 8.0,
    "excellent": 9.5,
}


def _fill_prompt(template: str, **kwargs) -> str:
    """Replace {placeholders} without interpreting JSON example braces via str.format."""
    out = template
    for key, value in kwargs.items():
        out = out.replace("{" + key + "}", str(value))
    return out


def _rating_value(rating) -> str:
    if hasattr(rating, "value"):
        return str(rating.value).lower()
    return str(rating).lower()


def _category_label(category) -> str:
    if hasattr(category, "value"):
        return str(category.value)
    return str(category)


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

    def generate_questions(
        self,
        resume_text: str,
        job_role: str = "Software Engineer",
    ) -> Tuple[List[InterviewQuestion], dict]:
        """Generate interview questions from resume text, steered by job role."""

        prompt = _fill_prompt(
            QUESTION_GENERATION_PROMPT,
            resume_text=resume_text,
            job_role=job_role or "Software Engineer",
        )

        try:
            response = self.model.invoke([
                SystemMessage(content="You are an expert technical interviewer. Generate only valid JSON output."),
                HumanMessage(content=prompt)
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

            if first_brace == -1 or last_brace == -1 or first_brace >= last_brace:
                raise ValueError("No valid JSON object found in response")

            content = content[first_brace:last_brace + 1]
            data = json.loads(content)

            category_map = {
                "skills": "skill",
                "skill": "skill",
                "generic_skill": "generic_skill",
                "generic": "generic_skill",
                "generic technical": "generic_skill",
                "projects": "project",
                "project": "project",
                "experience": "experience",
                "experiences": "experience",
                "achievements": "achievement",
                "achievement": "achievement",
                "scenario": "scenario",
                "scenarios": "scenario",
                "engineering scenario": "scenario",
                "behavioral": "behavioral",
                "behavioural": "behavioral",
            }

            questions = []
            valid_difficulties = {"easy", "intermediate", "advanced", "expert"}
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
                    difficulty_level=diff,
                    follow_up_question=q.get("follow_up_question", "") or "",
                )
                questions.append(question)

            # Hard cap so live interviews stay practical even if the model over-generates.
            questions = questions[:MAX_PRIMARY_QUESTIONS]

            profile = data.get("extracted_profile", {})
            return questions, profile

        except Exception as e:
            logger.exception("Question generation failed: %s: %s", type(e).__name__, e)
            raise QuestionGenerationError(f"Error generating questions: {e}") from e

    def generate_followup(
        self,
        primary_question: str,
        candidate_answer: str,
        difficulty_level: str,
        context: str,
        conversation_history_text: str = "",
        current_depth: int = 1,
        max_depth: int = 3,
        follow_up_direction: str = "",
        suggested_follow_up: str = "",
    ) -> str:
        """Generate follow-up question based on candidate answer and conversation history"""

        history_text = conversation_history_text if conversation_history_text else "[No prior follow-ups yet]"

        prompt = _fill_prompt(
            FOLLOWUP_QUESTION_PROMPT,
            primary_question=primary_question,
            difficulty_level=difficulty_level,
            context=context,
            candidate_answer=candidate_answer,
            conversation_history=history_text,
            current_depth=current_depth,
            max_depth=max_depth,
            follow_up_direction=follow_up_direction or "Ask for a concrete example, at a depth appropriate to the candidate's level.",
            suggested_follow_up=suggested_follow_up or "[None provided]",
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
        """Evaluate candidate answer against the question that was actually asked."""

        prompt = _fill_prompt(
            ANSWER_EVALUATION_PROMPT,
            question=question,
            answer=candidate_answer,
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

            rating_raw = str(data.get("rating", "fair")).lower().strip()
            if rating_raw not in RATING_TO_SCORE_10:
                rating_raw = "fair"

            score_raw = data.get("score", RATING_TO_SCORE_10[rating_raw])
            try:
                score_val = float(score_raw)
            except (TypeError, ValueError):
                score_val = RATING_TO_SCORE_10[rating_raw]

            # Normalize accidental 0–100 scores to 0–10.
            if score_val > 10:
                score_val = score_val / 10.0
            score_val = max(1.0, min(10.0, score_val))

            return AnswerEvaluation(
                rating=rating_raw,
                score=score_val,
                strengths=data.get("strengths", []) or [],
                improvements=data.get("improvements", []) or [],
                missing_concepts=data.get("missing_concepts", []) or [],
                follow_up_direction=data.get("follow_up_direction", "") or "",
            )

        except Exception as e:
            # `except (json.JSONDecodeError, Exception)` was redundant - the second
            # arm already caught everything, including the first.
            # Default to "good" (not "fair") so parse failures do not over-probe.
            logger.warning("evaluate_answer parse failed: %s", e)
            return AnswerEvaluation(
                rating=RatingEnum.GOOD,
                score=RATING_TO_SCORE_10["good"],
                strengths=["Answer provided"],
                improvements=["Could not fully parse automated evaluation; review manually if needed"],
                missing_concepts=[],
                follow_up_direction="Ask for one concrete example or implementation detail",
            )


class InterviewSessionManager:
    """Manage interview sessions"""

    def __init__(self):
        self.session_store = RedisSessionStore()
        self.generator = InterviewQuestionGenerator()

    def _save_session(self, session: InterviewSession) -> None:
        """Persist session after every mutation."""
        self.session_store.set(session.session_id, session)

    def _append_history(self, session: InterviewSession, question: str, answer: str, kind: str) -> None:
        block = f"[{kind}_QUESTION] {question}\n[{kind}_ANSWER] {answer}"
        if session.conversation_history:
            session.conversation_history = f"{session.conversation_history}\n\n{block}"
        else:
            session.conversation_history = block

    def create_session(
        self,
        resume_text: str,
        job_role: str,
        resume_name: str
    ) -> InterviewSession:
        """Create a new interview session"""

        questions, profile = self.generator.generate_questions(resume_text, job_role=job_role)

        session_id = str(uuid.uuid4())
        session = InterviewSession(
            session_id=session_id,
            resume_name=resume_name,
            job_role=job_role,
            extracted_profile=profile,
            questions=questions,
            conversation_history="",
            memory=None,
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

        if not answer or not str(answer).strip():
            raise ValueError("Answer cannot be empty")

        # Truncate rather than reject, so a long dictation is still usable while
        # the prompt sent to the LLM stays bounded.
        answer = str(answer).strip()[:MAX_ANSWER_CHARS]

        if session.current_question_index >= len(session.questions):
            raise ValueError(f"No current question in session {session_id}")

        current_question = session.questions[session.current_question_index]

        # Evaluate against the question that was actually asked.
        if session.is_followup_mode:
            question_asked = (
                session.current_followup_question
                or (session.follow_ups[-1].question if session.follow_ups else current_question.primary_question)
            )
            history_kind = "FOLLOWUP"
        else:
            question_asked = current_question.primary_question
            history_kind = "PRIMARY"

        self._append_history(session, question_asked, answer, history_kind)

        candidate_answer = CandidateAnswer(
            question_id=current_question.id,
            answer=answer,
            is_followup=session.is_followup_mode,
            followup_depth=session.current_followup_depth
        )
        session.answers.append(candidate_answer)

        evaluation = self.generator.evaluate_answer(
            question=question_asked,
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
                    RatingEnum.GOOD,
                ]
            ):
                session.current_followup_depth += 1
                should_ask_followup = True
            else:
                should_ask_followup = False

        follow_up_question = None
        if should_ask_followup:
            action = "follow_up"
            # Prefer bank follow-up as a seed on first depth; always adapt via LLM.
            suggested = current_question.follow_up_question if session.current_followup_depth == 1 else ""

            difficulty = (
                current_question.difficulty_level.value
                if hasattr(current_question.difficulty_level, "value")
                else str(current_question.difficulty_level)
            )
            follow_up_q = self.generator.generate_followup(
                primary_question=current_question.primary_question,
                candidate_answer=answer,
                difficulty_level=difficulty,
                context=current_question.context,
                conversation_history_text=session.conversation_history,
                current_depth=session.current_followup_depth,
                max_depth=session.max_followup_depth,
                follow_up_direction=evaluation.follow_up_direction,
                suggested_follow_up=suggested,
            )

            follow_up_question = follow_up_q
            session.current_followup_question = follow_up_q

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

            # Persist evaluation for the answer that closed this thread.
            session.follow_ups.append(FollowUpQuestion(
                original_question_id=current_question.id,
                depth=session.current_followup_depth,
                question=question_asked,
                candidate_answer=answer,
                evaluation=evaluation
            ))

            session.is_followup_mode = False
            session.current_followup_depth = 0
            session.current_followup_question = ""
            session.conversation_history = ""

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
                    "category": _category_label(next_q.category),
                    "name": next_q.name,
                    "primary_question": next_q.primary_question,
                    "context": next_q.context,
                    "difficulty_level": (
                        next_q.difficulty_level.value
                        if hasattr(next_q.difficulty_level, "value")
                        else next_q.difficulty_level
                    ),
                }
            else:
                session.status = "completed"

        self._save_session(session)
        return result

    def proceed_to_next_question(self, session_id: str) -> bool:
        """
        Deprecated - progression now happens in submit_answer().
        Kept for backward compatibility only.
        """
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        if session.current_question_index < len(session.questions) - 1:
            session.current_question_index += 1
            session.is_followup_mode = False
            session.current_followup_depth = 0
            session.current_followup_question = ""
            session.conversation_history = ""
            self._save_session(session)
            return True

        session.status = "completed"
        self._save_session(session)
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
                    "category": _category_label(question.category),
                    "answer": answer.answer,
                    "follow_ups": [
                        {
                            "question": f.question,
                            "candidate_answer": f.candidate_answer,
                            "evaluation": (
                                f.evaluation.model_dump(mode="json")
                                if hasattr(f.evaluation, "model_dump")
                                else f.evaluation.dict()
                            ),
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
            all_evaluations = [follow_up.evaluation for follow_up in session.follow_ups]

            strengths = []
            improvements = []
            missing = []
            for ev in all_evaluations:
                strengths.extend(ev.strengths or [])
                improvements.extend(ev.improvements or [])
                missing.extend(getattr(ev, "missing_concepts", None) or [])

            context = f"""
Based on this interview for role: {session.job_role}

Candidate's Performance:
- Total Questions: {len(session.questions)}
- Answers Submitted: {len(session.answers)}
- Evaluations Recorded: {len(all_evaluations)}

Observed strengths (from evaluations):
{json.dumps(strengths[:12], indent=2)}

Observed improvements (from evaluations):
{json.dumps(improvements[:12], indent=2)}

Missing concepts:
{json.dumps(missing[:12], indent=2)}

Question Categories:
"""
            for q in session.questions[:8]:
                context += f"\n- {_category_label(q.category)}: {q.name}"

            context += """

Return ONLY valid JSON with this shape:
{
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "recommendations": ["...", "...", "..."],
  "focus_areas": ["...", "...", "..."]
}
"""

            response = self.generator.model.invoke([
                SystemMessage(content="You are a career coach. Generate only valid JSON improvement plan."),
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
                "strengths": data.get("strengths", []) or strengths[:3] or ["Participated in interview"],
                "weaknesses": data.get("weaknesses", []) or improvements[:3] or ["Area for growth"],
                "recommendations": data.get("recommendations", []) or ["Practice more interview questions"],
                "focus_areas": data.get("focus_areas", []) or ["Technical depth", "Communication"],
            }

        except Exception as e:
            logger.warning("Failed to generate improvement plan: %s", e)
            return {
                "strengths": ["Participated in interview"],
                "weaknesses": ["Area for growth"],
                "recommendations": ["Practice more interview questions"],
                "focus_areas": ["Technical depth", "Communication"]
            }

    def calculate_interview_score(self, session_id: str) -> dict:
        """Calculate comprehensive interview scores from recorded evaluations."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        technical_scores = []
        for follow_up in session.follow_ups:
            rating_key = _rating_value(follow_up.evaluation.rating)
            # `is not None` rather than truthiness: a legitimate 0.0 score would
            # otherwise silently fall through to the rating-based default.
            if getattr(follow_up.evaluation, "score", None) is not None:
                # evaluation.score is 1–10; convert to 0–100 for report metrics.
                technical_scores.append(float(follow_up.evaluation.score) * 10.0)
            else:
                technical_scores.append(RATING_TO_SCORE.get(rating_key, 60.0))

        # Also fold in answers that somehow lack follow-up records.
        if not technical_scores and session.answers:
            technical_scores = [60.0]

        avg_technical = sum(technical_scores) / len(technical_scores) if technical_scores else 0.0

        # Derive soft metrics from answer substance when proctoring feeds are absent.
        answer_lengths = [len((a.answer or "").split()) for a in session.answers]
        avg_words = (sum(answer_lengths) / len(answer_lengths)) if answer_lengths else 0.0
        length_factor = min(1.0, avg_words / 80.0) if avg_words else 0.7

        communication = round(max(40.0, min(95.0, avg_technical * (0.85 + 0.15 * length_factor))), 1)
        confidence = round(max(40.0, min(95.0, avg_technical * (0.88 + 0.10 * length_factor))), 1)
        # Eye contact remains a proxy until live proctoring metrics are persisted on the session.
        eye_contact = round(max(40.0, min(95.0, avg_technical * 0.90)), 1)
        resume_alignment = round(max(40.0, min(95.0, avg_technical * 0.93)), 1)
        problem_solving = round(avg_technical * 0.9, 1)
        overall = round(
            (avg_technical + communication + confidence + eye_contact + resume_alignment) / 5,
            1,
        )

        return {
            "technical_score": round(avg_technical, 1),
            "communication_score": communication,
            "confidence_score": confidence,
            "eye_contact_score": eye_contact,
            "resume_alignment_score": resume_alignment,
            "problem_solving_score": problem_solving,
            "overall_score": overall,
        }
