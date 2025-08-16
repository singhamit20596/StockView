import React, { useState } from 'react';

export const InteractionTest: React.FC = () => {
  const [clicks, setClicks] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const handleClick = () => {
    setClicks(prev => prev + 1);
    console.log('Button clicked!', clicks + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    console.log('Input changed:', e.target.value);
  };

  return (
    <div className="p-8 bg-white rounded-lg shadow-md max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Interaction Test</h2>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={handleClick}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Click Me! (Clicked: {clicks} times)
          </button>
        </div>
        
        <div>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type something here..."
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-gray-600 mt-2">You typed: {inputValue}</p>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              onChange={(e) => console.log('Checkbox toggled:', e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span>Test checkbox</span>
          </label>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">
          Check the browser console (F12) for interaction logs
        </p>
      </div>
    </div>
  );
};
