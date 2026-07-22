import sounddevice as sd
import numpy as np
import queue
import threading
import time
import torch

from faster_whisper import WhisperModel
from silero_vad import load_silero_vad, get_speech_timestamps




SAMPLE_RATE = 16000
BLOCK_DURATION = 0.5
CHUNK_DURATION = 2

FRAMES_PER_BLOCK = int(SAMPLE_RATE * BLOCK_DURATION)
FRAMES_PER_CHUNK = int(SAMPLE_RATE * CHUNK_DURATION)

SILENCE_TIMEOUT = 7




audio_queue = queue.Queue()
audio_buffer = []

current_answer = []
last_speech_time = time.time()

stop_event = threading.Event()




whisper_model = WhisperModel(
    "small",
    device="cpu",
    compute_type="int8"
)

vad_model = load_silero_vad()




def audio_callback(indata, frames, callback_time, status):

    if status:
        print(status)

    audio_queue.put(indata.copy())




def recorder():

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        blocksize=FRAMES_PER_BLOCK,
        callback=audio_callback
    ):

        print("🎤 Listening...")

        while not stop_event.is_set():
            sd.sleep(100)




def transcriber():

    global audio_buffer
    global last_speech_time

    while not stop_event.is_set():

        block = audio_queue.get()

        audio_buffer.append(block)

        total_frames = sum(len(x) for x in audio_buffer)

        if total_frames < FRAMES_PER_CHUNK:
            continue

        audio_data = np.concatenate(audio_buffer)
        audio_buffer = []

        audio_data = audio_data.flatten().astype(np.float32)




        speech = get_speech_timestamps(
            torch.from_numpy(audio_data),
            vad_model,
            sampling_rate=SAMPLE_RATE
        )

        if len(speech) == 0:

            silence_duration = time.time() - last_speech_time

            print(
                f"Silence: {silence_duration:.1f}s",
                end="\r"
            )

            if silence_duration >= SILENCE_TIMEOUT:

                print("\n\n✅ Candidate finished speaking")

                stop_event.set()

            continue

        last_speech_time = time.time()




        segments, _ = whisper_model.transcribe(
            audio_data,
            language="en",
            beam_size=5
        )

        for segment in segments:

            text = segment.text.strip()

            if not text:
                continue

            current_answer.append(text)

            print("📝", text)




threading.Thread(
    target=recorder,
    daemon=True
).start()

threading.Thread(
    target=transcriber,
    daemon=True
).start()




while not stop_event.is_set():
    time.sleep(1)

print("\n======================")
print("FINAL ANSWER")
print("======================")

print(" ".join(current_answer))