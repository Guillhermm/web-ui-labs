const append = (value) => {
  const currentValue = document.getElementById('result').value;

  // Prevent displayed number starts with zero.
  if (currentValue === '0') {
    // Do nothing in case first pressed button is operation instead of a number.
    if (value === "%" || value === "/" || value === "*" || value === "-" || value === "+" || value === "=") {
      return;
    }

    return document.getElementById('result').value = value;
  }

  document.getElementById('result').value += value;
};

const clearDisplay = () => {
  document.getElementById('result').value = '0';
};

const deleteLast = () => {
  let current = document.getElementById('result').value;

  // Deleting last unit number makes clean display.
  if (parseInt(current) < 10) {
    return clearDisplay();
  }

  document.getElementById('result').value = current.slice(0, -1);
};

const calculate = () => {
  try {
    let expression = document.getElementById('result').value;
    expression = expression.replace(/%/g, '/100');
    let result = eval(expression);
    document.getElementById('result').value = result;
  } catch (error) {
    document.getElementById('result').value = 'Error';
  }
};
