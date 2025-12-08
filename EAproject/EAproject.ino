// Pin definitions
const int BUTTON_PIN = 2;
const int TRIG_PIN   = 8;
const int ECHO_PIN   = 9;
const int LED1_PIN   = 3;
const int LED2_PIN   = 4;
const int LED3_PIN   = 5;
const int BUZZER_PIN = 6;   // The LED acting as a buzzer

// Configuration
const long DOOR_OPEN_DISTANCE = 15;
const int UNIT_DELAY = 150; // Speed of Morse code (lower is faster)

// Morse Code Dictionary
const char* letters[] = {
  ".-", "-...", "-.-.", "-..", ".", "..-.", "--.", "....", "..",    // A-I
  ".---", "-.-", ".-..", "--", "-.", "---", ".--.", "--.-", ".-.",  // J-R
  "...", "-", "..-", "...-", ".--", "-..-", "-.--", "--.."          // S-Z
};
const char* numbers[] = {
  "-----", ".----", "..---", "...--", "....-", ".....", "-....", "--...", "---..", "----."
};

// State variables
bool systemOn = false;
bool lastButtonReading = HIGH;
bool buttonPressed = false;
long lastDistance = 0;
bool doorIsOpen = false;

// Serial timer
unsigned long lastSerialSend = 0;
const unsigned long SERIAL_INTERVAL = 500;

void setup() {
  Serial.begin(9600);
  
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  allOutputsOff();
}

void loop() {
  handleSerialCommands(); // Listen for web commands
  handleButtonToggle();   // Listen for physical button

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

  // Send status to web app
  if (millis() - lastSerialSend >= SERIAL_INTERVAL) {
    sendStatus();
    lastSerialSend = millis();
  }
}

// --- Morse Code Functions ---

void playMorse(String message) {
  message.toUpperCase(); // Convert to uppercase for matching
  
  // Turn off alarm LEDs momentarily to focus on the message
  allOutputsOff();

  for (int i = 0; i < message.length(); i++) {
    char c = message[i];
    
    if (c >= 'A' && c <= 'Z') {
      flashSequence(letters[c - 'A']);
    } else if (c >= '0' && c <= '9') {
      flashSequence(numbers[c - '0']);
    } else if (c == ' ') {
      delay(UNIT_DELAY * 7); // Space between words
    }
    
    delay(UNIT_DELAY * 3); // Space between letters
  }
}

void flashSequence(const char* sequence) {
  int i = 0;
  while (sequence[i] != '\0') {
    digitalWrite(BUZZER_PIN, HIGH);
    
    if (sequence[i] == '.') {
      delay(UNIT_DELAY); // Dot duration
    } else {
      delay(UNIT_DELAY * 3); // Dash duration
    }
    
    digitalWrite(BUZZER_PIN, LOW);
    delay(UNIT_DELAY); // Space between parts of same letter
    i++;
  }
}

// --- Standard Functions ---

void handleSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "ON") {
      if (!systemOn) { systemOn = true; systemOnFeedback(); }
    } 
    else if (command == "OFF") {
      if (systemOn) { systemOn = false; systemOffFeedback(); }
    }
    else if (command.startsWith("MSG:")) {
      // Extract message after "MSG:" and play it
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

void handleButtonToggle() {
  int currentReading = digitalRead(BUTTON_PIN);
  if (lastButtonReading == HIGH && currentReading == LOW) {
    if (!buttonPressed) {
      buttonPressed = true;
      delay(50);
      systemOn = !systemOn;
      if (systemOn) systemOnFeedback(); else systemOffFeedback();
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
  digitalWrite(LED1_PIN, HIGH); digitalWrite(LED2_PIN, HIGH); digitalWrite(LED3_PIN, HIGH);
  delay(200);
  digitalWrite(LED1_PIN, LOW); digitalWrite(LED2_PIN, LOW); digitalWrite(LED3_PIN, LOW);
  delay(300);
}

long readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  return duration / 58;
}

void alertPattern() {
  digitalWrite(LED1_PIN, HIGH); digitalWrite(LED2_PIN, HIGH); digitalWrite(LED3_PIN, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);
  digitalWrite(LED1_PIN, LOW); digitalWrite(LED2_PIN, LOW); digitalWrite(LED3_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  delay(150);
}

void allOutputsOff() {
  digitalWrite(LED1_PIN, LOW); digitalWrite(LED2_PIN, LOW); digitalWrite(LED3_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
}
