from ultralytics import YOLO
import cv2

# ==========================
# Load YOLOv8
# ==========================
model = YOLO("yolov8n.pt")

# ==========================
# Webcam
# ==========================
cap = cv2.VideoCapture(0)

while True:

    ret, frame = cap.read()

    if not ret:
        break

    # Mirror effect
    frame = cv2.flip(frame, 1)

    warning_message = ""

    person_count = 0
    phone_detected = False

    # ==========================
    # YOLO Detection
    # ==========================
    results = model(
        frame,
        verbose=False
    )

    for result in results:

        boxes = result.boxes

        for box in boxes:

            cls = int(box.cls[0])

            class_name = model.names[cls]

            confidence = float(box.conf[0])

            # Ignore weak detections
            if confidence < 0.50:
                continue

            x1, y1, x2, y2 = map(
                int,
                box.xyxy[0]
            )

            # ==========================
            # PERSON
            # ==========================
            if class_name == "person":

                person_count += 1

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2
                )

                cv2.putText(
                    frame,
                    "Person",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2
                )

            # ==========================
            # CELL PHONE
            # ==========================
            elif class_name == "cell phone":

                phone_detected = True

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 0, 255),
                    2
                )

                cv2.putText(
                    frame,
                    "CELL PHONE",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 0, 255),
                    2
                )

    # ==========================
    # Warning Logic
    # ==========================
    if person_count > 1:

        warning_message = (
            f"MULTIPLE PERSONS DETECTED ({person_count})"
        )

    elif phone_detected:

        warning_message = (
            "CELL PHONE DETECTED"
        )

    # ==========================
    # Show Warning
    # ==========================
    if warning_message:

        cv2.rectangle(
            frame,
            (0, 0),
            (frame.shape[1], 80),
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

    # ==========================
    # Person Counter
    # ==========================
    cv2.putText(
        frame,
        f"Persons: {person_count}",
        (20, frame.shape[0] - 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2
    )

    # ==========================
    # Display
    # ==========================
    cv2.imshow(
        "InterviewAI - YOLO Monitor",
        frame
    )

    key = cv2.waitKey(1)

    if key == 27:  # ESC
        break

cap.release()
cv2.destroyAllWindows()