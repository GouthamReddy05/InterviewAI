import cv2
import mediapipe as mp
import time

# ==========================
# MediaPipe Setup
# ==========================
mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=5,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# ==========================
# Webcam
# ==========================
cap = cv2.VideoCapture(0)

# ==========================
# Timers
# ==========================
last_face_seen = time.time()
looking_away_start = None

FACE_MISSING_TIME = 2
LOOK_AWAY_TIME = 2

# ==========================
# Main Loop
# ==========================
while True:

    success, frame = cap.read()

    if not success:
        break

    frame = cv2.flip(frame, 1)

    h, w, _ = frame.shape

    warning_message = ""

    rgb = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    results = face_mesh.process(rgb)

    # ==================================
    # FACE NOT DETECTED
    # ==================================
    if not results.multi_face_landmarks:

        if time.time() - last_face_seen > FACE_MISSING_TIME:
            warning_message = "FACE NOT DETECTED"

        looking_away_start = None

    else:

        last_face_seen = time.time()

        # ==================================
        # MULTIPLE FACES
        # ==================================
        face_count = len(
            results.multi_face_landmarks
        )

        if face_count > 1:
            warning_message = (
                f"MULTIPLE PERSONS ({face_count})"
            )

        # ==================================
        # USE FIRST FACE
        # ==================================
        face = results.multi_face_landmarks[0]

        # Nose and Face Edges
        nose_x = face.landmark[1].x

        left_face_x = face.landmark[234].x
        right_face_x = face.landmark[454].x

        face_width = (
            right_face_x -
            left_face_x
        )

        if face_width > 0:

            ratio = (
                nose_x -
                left_face_x
            ) / face_width

            # ==========================
            # HEAD TURN DETECTION
            # ==========================
            # Forward ≈ 0.50
            # Strong Left < 0.25
            # Strong Right > 0.75
            # ==========================

            if ratio < 0.25:

                if looking_away_start is None:
                    looking_away_start = time.time()

                elif (
                    time.time()
                    - looking_away_start
                    > LOOK_AWAY_TIME
                ):
                    warning_message = (
                        "PLEASE LOOK FORWARD"
                    )

            elif ratio > 0.75:

                if looking_away_start is None:
                    looking_away_start = time.time()

                elif (
                    time.time()
                    - looking_away_start
                    > LOOK_AWAY_TIME
                ):
                    warning_message = (
                        "PLEASE LOOK FORWARD"
                    )

            else:

                looking_away_start = None

    # ==================================
    # WARNING OVERLAY
    # ==================================
    if warning_message:

        cv2.rectangle(
            frame,
            (0, 0),
            (w, 80),
            (0, 0, 255),
            -1
        )

        cv2.putText(
            frame,
            warning_message,
            (20, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 255, 255),
            2
        )

    # ==================================
    # SHOW CAMERA
    # ==================================
    cv2.imshow(
        "InterviewAI",
        frame
    )

    key = cv2.waitKey(1)

    if key == 27:  # ESC
        break

cap.release()
cv2.destroyAllWindows()