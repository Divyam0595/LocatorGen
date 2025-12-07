document.getElementById('option1').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const packageName = document.getElementById('packageName').value || 'com.example.pages';
    const className = document.getElementById('className').value || 'GeneratedPage';
  
    chrome.tabs.sendMessage(tab.id, {
      type: 'GENERATE_PAGE_OBJECT',
      packageName,
      className
    });
  });
  
  document.getElementById('option2').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    chrome.tabs.sendMessage(tab.id, {
      type: 'START_CURSOR_PICKER'
    });
  });