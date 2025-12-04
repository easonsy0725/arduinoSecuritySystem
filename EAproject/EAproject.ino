// Pin definitions
const int BUTTON_PIN = 2;
const int TRIG_PIN   = 8;
const int ECHO_PIN   = 9;
const int LED1_PIN   = 3;    // Red LED 1
const int LED2_PIN   = 4;    // Red LED 2
const int CAMERA_LED_PIN = 5; // "Camera" LED (was buzzer)
const int BUZZER_PIN = 6;    // Actual buzzer (new pin)

// Configuration
const long DOOR_OPEN_DISTANCE = 15;

// State variables
bool systemOn = false;
bool lastButtonReading = HIGH;
bool buttonPressed = false;
long lastDistance = 0;
bool doorIsOpen = false;
bool lastDoorState = false;

unsigned long lastSerialSend = 0;
const unsigned long SERIAL_INTERVAL = 500;

void setup() {
  Serial.begin(9600);
  
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(CAMERA_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  allOutputsOff();
}

void loop() {
  handleSerialCommands();
  handleButtonToggle();

  if (systemOn) {
    long distance = readDistanceCm();
    lastDistance = distance;

    bool doorOpen = distance > 0 && distance < DOOR_OPEN_DISTANCE;
    
    // Detect door opening (transition from closed to open)
    if (doorOpen && !lastDoorState) {
      // Door just opened! Simulate taking photo
      simulatePhotoCapture();
      Serial.println("PHOTO_TAKEN");
    }
    
    doorIsOpen = doorOpen;
    lastDoorState = doorOpen;

    if (doorOpen) {
      alertPattern();
    } else {
      allOutputsOff();
    }
  } else {
    doorIsOpen = false;
    lastDoorState = false;
    allOutputsOff();
  }

  if (millis() - lastSerialSend >= SERIAL_INTERVAL) {
    sendStatus();
    lastSerialSend = millis();
  }
}

void simulatePhotoCapture() {
  // Flash camera LED 3 times quickly to simulate taking photo
  for (int i = 0; i < 3; i++) {
    digitalWrite(CAMERA_LED_PIN, HIGH);
    delay(100);
    digitalWrite(CAMERA_LED_PIN, LOW);
    delay(100);
  }
}

void handleSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "ON") {
      if (!systemOn) {
        systemOn = true;
        systemOnFeedback();
      }
      Serial.println("OK");
    } 
    else if (command == "OFF") {
      if (systemOn) {
        systemOn = false;
        systemOffFeedback();
      }
      Serial.println("OK");
    }
    else if (command == "TOGGLE") {
      systemOn = !systemOn;
      if (systemOn) {
        systemOnFeedback();
      } else {
        systemOffFeedback();
      }
      Serial.println("OK");
    }
    else if (command == "STATUS") {
      sendStatus();
    }
    else if (command == "CLEAR_PHOTOS") {
      Serial.println("PHOTOS_CLEARED");
    }
  }
}

void sendStatus() {
  Serial.print("{\"systemOn\":");
  Serial.print(systemOn ? "true" : "false");
  Serial.print(",\"distance\":");
  Serial.print(lastDistance);
  Serial.print(",\"doorOpen\":");
  Serial.print(doorIsOpen ? "true" : "false");
  Serial.println("}");
}

void handleButtonToggle() {
  int currentReading = digitalRead(BUTTON_PIN);

  if (lastButtonReading == HIGH && currentReading == LOW) {
    if (!buttonPressed) {
      buttonPressed = true;
      delay(50);
      systemOn = !systemOn;
      
      if (systemOn) {
        systemOnFeedback();
      } else {
        systemOffFeedback();
      }
    }
  }

  if (lastButtonReading == LOW && currentReading == HIGH) {
    buttonPressed = false;
    delay(50);
  }

  lastButtonReading = currentReading;
}

void systemOnFeedback() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
  delay(300);
}

void systemOffFeedback() {
  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, HIGH);
  delay(200);
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  delay(300);
}

long readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) {
    return -1;
  }

  long distance = duration / 58;
  return distance;
}

void alertPattern() {
  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);

  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  delay(150);
}

void allOutputsOff() {
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(CAMERA_LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
}
