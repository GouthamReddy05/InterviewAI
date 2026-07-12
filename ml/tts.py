from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
import os


eleven = ElevenLabs(
    api_key="dbb0dafcd098a4b61eac7c9c038282f29ed39950fd87301d0ff6b65b1d8095a0"
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
