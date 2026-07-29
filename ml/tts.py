from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
import os
from dotenv import load_dotenv

load_dotenv()

eleven = ElevenLabs(
    api_key=os.environ.get("ELEVEN_LABS_API_KEY")
)

def generate_question(question):

    audio = eleven.text_to_speech.convert(
        voice_id="JBFqnCBsd6RMkjVDRZzb",
        text=question,
        model_id="eleven_multilingual_v2"
    )

    audio_bytes = b"".join(audio)

    return {
        "question": question,
        "audio": audio_bytes.hex()
    }

data = generate_question("tell me about your experience?")

with open("question.mp3", "wb") as f:
    f.write(bytes.fromhex(data["audio"]))

print("Saved!")
