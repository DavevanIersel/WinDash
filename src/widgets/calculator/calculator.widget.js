const outputEl = document.querySelector(".text");
        const valEl = document.querySelectorAll(".val");
        const ClearEl = document.querySelector(".AC");
        const deleteEl = document.querySelector(".DEL");
        const equalEl = document.querySelector(".equal");

        // Append button values to display
        valEl.forEach((val) => {
            val.addEventListener("click", () => {
                if (val.value === "^") {
                    outputEl.value += "**"; // Convert ^ to JS exponentiation
                } else if (val.value === "√") {
                    outputEl.value += "Math.sqrt("; // Square root function
                } else if (val.value === "sin") {
                    outputEl.value += "Math.sin("; // Sine function
                } else if (val.value === "cos") {
                    outputEl.value += "Math.cos("; // Cosine function
                } else if (val.value === "tan") {
                    outputEl.value += "Math.tan("; // Tangent function
                } else if (val.value === "log") {
                    outputEl.value += "Math.log10("; // Logarithm base 10
                } else {
                    outputEl.value += val.value;
                }
            });
        });

        // Clear display
        ClearEl.addEventListener("click", () => {
            outputEl.value = "";
        });

        // Delete last character
        deleteEl.addEventListener("click", () => {
            outputEl.value = outputEl.value.slice(0, -1);
        });

        // Evaluate expression
        equalEl.addEventListener("click", () => {
            try {
                outputEl.value = eval(outputEl.value + ")".repeat((outputEl.value.match(/\(/g) || []).length)); // Close unclosed brackets
            } catch (e) {
                alert("Syntax Error");
            }
        });