// Get elements
const chatForm = document.getElementById('chat-form');
const questionInput = document.getElementById('question-input');
const chatContainer = document.getElementById('chat-container');
const loadingIndicator = document.getElementById('loading-indicator');
const submitButton = chatForm.querySelector('button[type="submit"]');

// Add event listener for form submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload

    const question = questionInput.value.trim();
    if (!question) return; // Don't send empty messages

    // Disable form
    setFormDisabled(true);

    // 1. Display the user's question
    addMessageToChat(question, 'user');
    questionInput.value = ''; // Clear input

    // 2. Show loading indicator
    loadingIndicator.classList.remove('hidden');
    chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll down

    try {
        // 3. Send the question to the backend
        const response = await fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // 4. Display the bot's answer
        addMessageToChat(data.answer, 'bot');

    } catch (error) {
        // 5. Display any errors
        console.error('Fetch error:', error);
        addMessageToChat(`Sorry, an error occurred: ${error.message}`, 'bot');
    } finally {
        // 6. Re-enable form and hide loading
        loadingIndicator.classList.add('hidden');
        setFormDisabled(false);
        questionInput.focus(); // Re-focus the input
    }
});

function setFormDisabled(disabled) {
    questionInput.disabled = disabled;
    submitButton.disabled = disabled;
}

function addMessageToChat(message, sender) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'flex';

    const messageBubble = document.createElement('div');
    messageBubble.className = 'chat-bubble p-3 shadow';

    // Format message content
    // UPDATED: Removed the .replace() call.
    // We now directly set the innerHTML, which will
    // render the HTML response from the bot.
    messageBubble.innerHTML = message;

    if (sender === 'user') {
        messageBubble.classList.add('user-bubble');
    } else {
        messageBubble.classList.add('bot-bubble');
    }

    messageWrapper.appendChild(messageBubble);
    chatContainer.appendChild(messageWrapper);

    // Auto-scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
