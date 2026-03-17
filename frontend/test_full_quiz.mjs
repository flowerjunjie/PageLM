import WebSocket from "ws";

// Test 1: Quiz generation with WebSocket
async function testQuizGeneration() {
  console.log("Test 1: Quiz generation with WebSocket");
  
  const response = await fetch("http://localhost:5100/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: "World History" })
  });
  
  const data = await response.json();
  console.log("Quiz started:", data);
  
  if (!data.ok || !data.quizId) {
    throw new Error("Failed to start quiz: " + JSON.stringify(data));
  }
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://localhost:5100/ws/quiz?quizId=" + data.quizId);
    let receivedQuiz = false;
    let receivedDone = false;
    
    ws.on("open", () => {
      console.log("WebSocket connected");
    });
    
    ws.on("message", (msg) => {
      const event = JSON.parse(msg.toString());
      console.log("Event:", event.type);
      
      if (event.type === "quiz") {
        receivedQuiz = true;
        console.log("Quiz received with", Array.isArray(event.quiz) ? event.quiz.length : 0, "questions");
        
        if (Array.isArray(event.quiz) && event.quiz.length === 5) {
          // Validate quiz structure
          const valid = event.quiz.every(q => 
            q.id && 
            q.question && 
            Array.isArray(q.options) && q.options.length === 4 &&
            typeof q.correct === "number" && q.correct >= 1 && q.correct <= 4 &&
            q.hint && 
            q.explanation
          );
          
          if (!valid) {
            reject(new Error("Invalid quiz structure"));
          }
        } else {
          reject(new Error("Quiz does not have 5 questions"));
        }
      }
      
      if (event.type === "done") {
        receivedDone = true;
        ws.close();
        
        if (receivedQuiz && receivedDone) {
          console.log("Test 1 PASSED");
          resolve(true);
        } else {
          reject(new Error("Did not receive quiz before done"));
        }
      }
      
      if (event.type === "error") {
        ws.close();
        reject(new Error("Received error event: " + event.error));
      }
    });
    
    ws.on("error", (err) => {
      reject(new Error("WebSocket error: " + err.message));
    });
    
    setTimeout(() => {
      ws.close();
      reject(new Error("Test timeout"));
    }, 60000);
  });
}

// Test 2: Quiz with empty topic should fail
async function testEmptyTopic() {
  console.log("\nTest 2: Quiz with empty topic should fail");
  
  const response = await fetch("http://localhost:5100/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: "" })
  });
  
  const data = await response.json();
  console.log("Response:", data);
  
  if (response.status === 400 && !data.ok) {
    console.log("Test 2 PASSED");
    return true;
  } else {
    throw new Error("Expected 400 error for empty topic");
  }
}

// Test 3: WebSocket without quizId should fail
async function testWebSocketWithoutQuizId() {
  console.log("\nTest 3: WebSocket without quizId should fail");
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://localhost:5100/ws/quiz");
    
    ws.on("open", () => {
      console.log("WebSocket connected (unexpected)");
    });
    
    ws.on("close", (code) => {
      console.log("WebSocket closed with code:", code);
      if (code === 1008) {
        console.log("Test 3 PASSED");
        resolve(true);
      } else {
        reject(new Error("Expected close code 1008, got " + code));
      }
    });
    
    ws.on("error", (err) => {
      // Expected error
      console.log("WebSocket error (expected):", err.message);
    });
    
    setTimeout(() => {
      reject(new Error("Test timeout"));
    }, 5000);
  });
}

// Run all tests
async function runTests() {
  try {
    await testQuizGeneration();
    await testEmptyTopic();
    await testWebSocketWithoutQuizId();
    console.log("\n=== ALL TESTS PASSED ===");
    process.exit(0);
  } catch (err) {
    console.error("\n=== TEST FAILED ===");
    console.error(err.message);
    process.exit(1);
  }
}

runTests();
