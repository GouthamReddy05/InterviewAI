#!/usr/bin/env python3
"""Test Gemini response directly"""

from dotenv import load_dotenv
load_dotenv()

import os
from langchain_core.messages import SystemMessage, HumanMessage
from langchain.chat_models import init_chat_model

# Get API key
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("❌ GOOGLE_API_KEY not set")
    exit(1)

print("✅ API Key found")

# Initialize model
model = init_chat_model("google_genai:gemini-2.5-flash", api_key=api_key)
print("✅ Gemini model initialized")

# Simple test prompt
test_prompt = """
Generate interview questions for a Python developer in JSON format.

Return ONLY this JSON structure:
{
  "questions": [
    {
      "id": 1,
      "category": "skill",
      "name": "Python",
      "primary_question": "How do you optimize Python code?",
      "context": "Performance optimization",
      "difficulty_level": "intermediate"
    },
    {
      "id": 2,
      "category": "skill",
      "name": "Python",
      "primary_question": "Explain list comprehensions",
      "context": "Python features",
      "difficulty_level": "intermediate"
    }
  ]
}

DO NOT add any markdown, code blocks, or explanations. ONLY JSON.
"""

print("\n📤 Sending test prompt to Gemini...")

try:
    response = model.invoke([
        SystemMessage(content="You are a technical interviewer. Return only JSON."),
        HumanMessage(content=test_prompt)
    ])
    
    content = response.content.strip()
    
    print(f"\n✅ Got response from Gemini")
    print(f"Response length: {len(content)} characters")
    print(f"\n{'='*60}")
    print("FULL RESPONSE:")
    print(f"{'='*60}")
    print(content)
    print(f"{'='*60}\n")
    
    # Try to parse it
    import json
    
    # Clean markdown if present
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        parts = content.split("```")
        content = parts[1] if len(parts) > 1 else content
    
    content = content.strip()
    
    # Find JSON braces
    first_brace = content.find('{')
    last_brace = content.rfind('}')
    
    if first_brace != -1 and last_brace != -1:
        content = content[first_brace:last_brace + 1]
    
    print("Attempting JSON parse...")
    data = json.loads(content)
    
    print("✅ JSON PARSED SUCCESSFULLY!")
    print(f"Number of questions: {len(data.get('questions', []))}")
    
    for q in data.get('questions', []):
        print(f"  - {q.get('name')}: {q.get('primary_question')[:50]}...")
    
except json.JSONDecodeError as e:
    print(f"❌ JSON Parse Error: {e}")
    print(f"Attempted to parse:\n{content[:500]}")
except Exception as e:
    print(f"❌ Error: {type(e).__name__}: {e}")
