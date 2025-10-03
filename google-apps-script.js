const WEBHOOK_URL = 'https://brave-ideas-glow.loca.lt/google-forms-webhook';

function onFormSubmit(e) {
  console.log('🔔🔔🔔 onFormSubmit TRIGGERED at: ' + new Date().toISOString());
  
  try {
    console.log('✅ TRY BLOCK STARTED');
    
    if (!e || !e.response) {
      console.log('❌ No event data');
      return;
    }
    
    var formResponse = e.response;
    console.log('📝 Form Response ID: ' + formResponse.getId());
    console.log('🕒 Form Response Timestamp: ' + formResponse.getTimestamp());
    
    // Get the form directly (FIXED)
    var form = FormApp.getActiveForm();
    console.log('📋 Form Title: ' + form.getTitle());
    console.log('📋 Form ID: ' + form.getId());
    
    var itemResponses = formResponse.getItemResponses();
    console.log('❓ Number of item responses: ' + itemResponses.length);
    
    if (itemResponses.length === 0) {
      console.log('❌ NO ITEM RESPONSES FOUND');
      return;
    }
    
    console.log('✅ Item responses found');
    
    // Log each question and answer
    console.log('📝 FORM DATA RECEIVED:');
    for (var i = 0; i < itemResponses.length; i++) {
      try {
        var itemResponse = itemResponses[i];
        var question = itemResponse.getItem();
        var questionTitle = question.getTitle();
        var answer = itemResponse.getResponse();
        var questionType = question.getType();
        
        console.log('   Q' + (i + 1) + ': "' + questionTitle + '"');
        console.log('      Answer: "' + answer + '"');
        console.log('      Type: ' + questionType);
      } catch (qError) {
        console.log('   ❌ Error reading question ' + i + ': ' + qError.toString());
      }
    }
    
    // Build the webhook data (FIXED)
    console.log('🏗️ Building webhook data...');
    var webhookData = {
      formResponse: {
        responseId: formResponse.getId(),
        formId: form.getId(),
        formTitle: form.getTitle(),
        createTime: formResponse.getTimestamp().toISOString(),
        answers: {}
      }
    };
    
    // Process each response with proper field mapping
    for (var i = 0; i < itemResponses.length; i++) {
      var itemResponse = itemResponses[i];
      var question = itemResponse.getItem();
      var questionTitle = question.getTitle();
      var answer = itemResponse.getResponse();
      
      // Create simplified key
      var key = questionTitle.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      console.log('   Mapping: "' + questionTitle + '" → "' + key + '"');
      
      // Determine answer type
      var answerData;
      if (questionTitle.toLowerCase().includes('email')) {
        answerData = { email: answer };
      } else if (question.getType() === FormApp.ItemType.MULTIPLE_CHOICE || 
                 question.getType() === FormApp.ItemType.LIST) {
        answerData = {
          choiceQuestions: {
            answers: [{ value: answer }]
          }
        };
      } else if (question.getType() === FormApp.ItemType.CHECKBOX) {
        // For checkbox, answer is an array
        var answersArray = Array.isArray(answer) ? answer : [answer];
        answerData = {
          choiceQuestions: {
            answers: answersArray.map(function(choice) { return { value: choice }; })
          }
        };
      } else {
        answerData = {
          textAnswers: {
            answers: [{ value: answer.toString() }]
          }
        };
      }
      
      webhookData.formResponse.answers[key] = answerData;
    }
    
    console.log('📤 SENDING TO WEBHOOK...');
    console.log('URL: ' + WEBHOOK_URL);
    console.log('Data: ' + JSON.stringify(webhookData, null, 2));
    
    // Send to webhook
    var options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(webhookData),
      'muteHttpExceptions': true
    };
    
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    console.log('📨 WEBHOOK RESPONSE:');
    console.log('   Status: ' + responseCode);
    console.log('   Body: ' + responseText);
    
    if (responseCode === 200) {
      console.log('🎉 SUCCESS! Data sent to Monday.com');
      
      // Parse the response to see what Monday.com created
      try {
        var responseData = JSON.parse(responseText);
        if (responseData.mondayItem) {
          console.log('📋 Monday.com Item ID: ' + responseData.mondayItem.id);
          console.log('📋 Monday.com Item Name: ' + responseData.mondayItem.name);
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse response JSON');
      }
    } else {
      console.log('❌ Webhook returned error: ' + responseCode);
    }
    
    console.log('✅ onFormSubmit COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    console.error('💥 CATCH BLOCK - UNHANDLED ERROR:');
    console.error('   Message: ' + error.message);
    console.error('   Stack: ' + error.stack);
  }
  
  console.log('🔔🔔🔔 onFormSubmit FINISHED');
}

function setupTrigger() {
  console.log('🔧 Setting up form trigger...');
  
  const form = FormApp.getActiveForm();
  
  // Remove any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(trigger);
      console.log('🗑️ Removed old trigger');
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();
  
  console.log('✅ Trigger setup completed!');
}

// TEST FUNCTION - Use this to test
function testWebhook() {
  console.log('🧪 Testing webhook with correct data format...');
  
  const testData = {
    formResponse: {
      responseId: "test-" + new Date().getTime(),
      formTitle: "Test Form",
      createTime: new Date().toISOString(),
      answers: {
        "full_name": {
          textAnswers: {
            answers: [{ value: "Test User" }]
          }
        },
        "email": {
          email: "test@example.com"
        },
        "event_name": {
          textAnswers: {
            answers: [{ value: "Test Event" }]
          }
        },
        "event_address": {
          textAnswers: {
            answers: [{ value: "123 Test Street" }]
          }
        },
        "event_timing": {
          textAnswers: {
            answers: [{ value: "January 16, 2024" }]
          }
        },
        "event_type": {
          choiceQuestions: {
            answers: [{ value: "Conference" }]
          }
        },
        "organization": {
          choiceQuestions: {
            answers: [{ value: "Tech Corp" }]
          }
        }
      }
    }
  };
  
  try {
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(testData),
      'muteHttpExceptions': true
    };
    
    console.log('Sending test data to webhook...');
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('✅ Test response code:', responseCode);
    console.log('✅ Test response body:', responseText);
    
  } catch(error) {
    console.error('❌ Test failed:', error.toString());
  }
}

function checkTriggers() {
  console.log('🔍 Checking active triggers...');
  
  const triggers = ScriptApp.getProjectTriggers();
  
  if (triggers.length === 0) {
    console.log('❌ No triggers found. Run setupTrigger() first.');
  } else {
    triggers.forEach(trigger => {
      console.log(`✅ ${trigger.getHandlerFunction()} - ${trigger.getEventType()}`);
    });
  }
}