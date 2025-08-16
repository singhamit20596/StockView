// Add this to browser console to test basic functionality
console.log('🔍 StockView Diagnostic Script');
console.log('Current URL:', window.location.href);
console.log('Viewport size:', window.innerWidth + 'x' + window.innerHeight);

// Test if React is loaded
if (window.React) {
  console.log('✅ React is loaded');
} else {
  console.log('❌ React is not loaded');
}

// Test if document is interactive
console.log('Document ready state:', document.readyState);

// Check for layout issues
console.log('🔍 Checking for layout issues...');

// Test if sidebar is overlapping main content
const sidebar = document.querySelector('[class*="md:fixed"]');
const mainContent = document.querySelector('main');
if (sidebar && mainContent) {
  const sidebarRect = sidebar.getBoundingClientRect();
  const mainRect = mainContent.getBoundingClientRect();
  console.log('Sidebar bounds:', sidebarRect);
  console.log('Main content bounds:', mainRect);
  
  if (sidebarRect.right > mainRect.left && window.innerWidth >= 768) {
    console.log('⚠️  Potential overlap detected on desktop!');
  } else {
    console.log('✅ No overlap detected');
  }
}

// Test basic DOM manipulation
const testDiv = document.createElement('div');
testDiv.id = 'diagnostic-test';
testDiv.innerHTML = 'Diagnostic Test Element - Click Me!';
testDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: red; color: white; padding: 10px; z-index: 9999; cursor: pointer; border: 2px solid white;';
testDiv.onclick = function() {
  console.log('✅ Click event works!');
  this.style.background = 'green';
  this.innerHTML = 'Click Works!';
  
  // Test if buttons in main content are clickable
  setTimeout(() => {
    const buttons = document.querySelectorAll('button');
    console.log(`Found ${buttons.length} buttons on the page`);
    buttons.forEach((btn, i) => {
      const rect = btn.getBoundingClientRect();
      console.log(`Button ${i + 1}:`, {
        visible: rect.width > 0 && rect.height > 0,
        position: `${rect.left}, ${rect.top}`,
        zIndex: window.getComputedStyle(btn).zIndex,
        pointerEvents: window.getComputedStyle(btn).pointerEvents
      });
    });
  }, 1000);
};
document.body.appendChild(testDiv);

// Test responsive design
function checkResponsiveLayout() {
  const width = window.innerWidth;
  console.log(`Screen width: ${width}px`);
  if (width >= 768) {
    console.log('Desktop layout should be active');
  } else {
    console.log('Mobile layout should be active');
  }
}

checkResponsiveLayout();
window.addEventListener('resize', checkResponsiveLayout);

console.log('🔍 Diagnostic complete. Try clicking the red box in the top-right corner.');
