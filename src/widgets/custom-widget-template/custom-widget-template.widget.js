// Select the container element
const container = document.querySelector('.widget-container');

// Create a new button element
const button = document.createElement('button');
button.textContent = 'Click Me!';
button.id = '#actionButton';
button.onclick = () => alert('Button is working!');

// Append the button to the container
container.appendChild(button);
