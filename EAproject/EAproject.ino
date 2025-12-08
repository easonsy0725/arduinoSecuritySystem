// === Security System: Dedicated Panic Button Version (NON-BLOCKING) ===

// Pin definitions
const int BUTTON_PIN    = 2; // Normal arm/disarm button
const int PANIC_BTN_PIN = 7; // Dedicated panic button

const int TRIG_PIN   = 8;
const int ECHO_PIN   = 9;

const int LED1_PIN   = 3; // Alarm LED 1
const int LED2_PIN   = 4; // Alarm LED 2
const int LED3_PIN   = 5; // Alarm LED 3
const int BUZZER_PIN = 6; // LED acting as buzzer + Morse output

// Configuration
const long DOOR_OPEN_DISTANCE = 15; // cm
const int UNIT_DELAY = 150;        // Morse timing unit (ms)

// Morse Code Dictionary
const char* letters[] = {
  ".-", "-...", "-.-.", "-..", ".", "..-.", "--.", "....", "..",    // A-I
  ".---", "-.-", ".-..", "--", "-.", "---", ".--.", "--.-", ".-.",  // J-R
  "...", "-", "..-", "...-", ".--", "-..-", "-.--", "--.."          // S-Z
};
const char* numbers[] = {
  "-----", ".----", "..---", "...--", "....-",
  ".....", "-....", "--...", "---..", "----."
};

// State variables
bool systemOn = false;
bool lastButtonReading = HIGH;
bool buttonPressed = false;
bool lastPanicReading = HIGH;   // NEW: for edge detection on panic button

long lastDistance = 0;
bool doorIsOpen = false;

// Serial status timing
unsigned long lastSerialSend = 0;
const unsigned long SERIAL_INTERVAL = 500; // ms

void setup() {
  Serial.begin(9600);

  // Inputs: buttons use INPUT_PULLUP, wired to GND
  pinMode(BUTTON_PIN,    INPUT_PULLUP);
  pinMode(PANIC_BTN_PIN, INPUT_PULLUP);
  pinMode(ECHO_PIN,      INPUT);

  // Outputs
  pinMode(TRIG_PIN,  OUTPUT);
  pinMode(LED1_PIN,  OUTPUT);
  pinMode(LED2_PIN,  OUTPUT);
  pinMode(LED3_PIN,  OUTPUT);
  pinMode(BUZZER_PIN,OUTPUT);

  allOutputsOff();
}

void loop() {
  handleSerialCommands(); // Web commands
  handleButtonToggle();   // Normal arm/disarm button
  handlePanicButton();    // Dedicated panic button

  if (systemOn) {
    long distance = readDistanceCm();
    lastDistance = distance;

    bool doorOpen = distance > 0 && distance < DOOR_OPEN_DISTANCE;
    doorIsOpen = doorOpen;

    if (doorOpen) {
      alertPattern();
    } else {
      allOutputsOff();
    }
  } else {
    doorIsOpen = false;
    allOutputsOff();
  }

  // Send status to Node.js
  if (millis() - lastSerialSend >= SERIAL_INTERVAL) {
    sendStatus();
    lastSerialSend = millis();
  }
}

// ================== Panic Button (NON-BLOCKING) ==================

void handlePanicButton() {
  int current = digitalRead(PANIC_BTN_PIN);

  // Falling edge: HIGH -> LOW (button just pressed)
  if (lastPanicReading == HIGH && current == LOW) {
    // 1. Silent Alarm: visually disarm
    systemOn = false;
    systemOffFeedback();

    // 2. Send secret panic signal to server
    Serial.println("PANIC");
    // No delay, no blocking loop here
  }

  lastPanicReading = current;
}

// ================== Normal Button Logic ==================

void handleButtonToggle() {
  int currentReading = digitalRead(BUTTON_PIN);

  // Button just pressed
  if (lastButtonReading == HIGH && currentReading == LOW) {
    if (!buttonPressed) {
      buttonPressed = true;
      delay(50); // debounce

      systemOn = !systemOn;
      if (systemOn) systemOnFeedback();
      else          systemOffFeedback();
    }
  }

  // Button released
  if (lastButtonReading == LOW && currentReading == HIGH) {
    buttonPressed = false;
    delay(50); // debounce
  }

  lastButtonReading = currentReading;
}

// ================== Morse Code Functions ==================

void playMorse(String message) {
  message.toUpperCase();
  allOutputsOff();

  for (int i = 0; i < message.length(); i++) {
    char c = message[i];

    if (c >= 'A' && c <= 'Z')       flashSequence(letters[c - 'A']);
    else if (c >= '0' && c <= '9')  flashSequence(numbers[c - '0']);
    else if (c == ' ')             delay(UNIT_DELAY * 7); // word gap

    delay(UNIT_DELAY * 3); // gap between letters
  }
}

void flashSequence(const char* sequence) {
  int i = 0;
  while (sequence[i] != '\0') {
    digitalWrite(BUZZER_PIN, HIGH);
    if (sequence[i] == '.') delay(UNIT_DELAY);      // dot
    else                    delay(UNIT_DELAY * 3);  // dash
    digitalWrite(BUZZER_PIN, LOW);
    delay(UNIT_DELAY); // gap inside letter
    i++;
  }
}

// ================== Serial / Web Commands ==================

void handleSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "ON") {
      if (!systemOn) {
        systemOn = true;
        systemOnFeedback();
      }
    }
    else if (command == "OFF") {
      if (systemOn) {
        systemOn = false;
        systemOffFeedback();
      }
    }
    else if (command.startsWith("MSG:")) {
      String msg = command.substring(4);
      playMorse(msg);
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

// ================== Feedback & Helpers ==================

void systemOnFeedback() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
  delay(300);
}

void systemOffFeedback() {
  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, HIGH);
  digitalWrite(LED3_PIN, HIGH);
  delay(200);
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);
  delay(300);
}

long readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  return duration / 58;
}

void alertPattern() {
  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, HIGH);
  digitalWrite(LED3_PIN, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);

  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  delay(150);
}

void allOutputsOff() {
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
}
