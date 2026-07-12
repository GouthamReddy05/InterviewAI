import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from question_generator import InterviewSessionManager

manager = InterviewSessionManager()
sample_resume = "Software Engineer with 5 years of experience in Python, React, and AWS. Built a microservices architecture using Docker and Kubernetes. Won the company hackathon in 2021."

print("Generating questions...")
try:
    session = manager.create_session(sample_resume, "Software Engineer", "resume.pdf")
    print(f"Generated {len(session.questions)} questions successfully.")
except Exception as e:
    import traceback
    traceback.print_exc()
