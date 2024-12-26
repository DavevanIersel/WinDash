const container = document.querySelector('.widget-container');

const button = document.createElement('button');
button.textContent = 'Click Me!';
button.id = '#actionButton';
button.onclick = () => alert('Button is working!');

container.appendChild(button);
