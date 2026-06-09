from faster_whisper import WhisperModel
# from elevenlabs import generate_question

model = WhisperModel("small", device="cpu", compute_type="int8")

# question, audio = generate_question("tell me about your experience?")

segments, info = model.transcribe("test.mp3", language="en", beam_size=5)

for segment in segments:    
    print(segment.text)



import ctranslate2

print(ctranslate2.get_supported_compute_types("cpu"))