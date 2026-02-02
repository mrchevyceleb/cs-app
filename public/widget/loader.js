/**
 * Customer Support Widget Loader
 *
 * Usage:
 * <script
 *   src="https://your-domain.com/widget/loader.js"
 *   data-position="bottom-right"
 *   data-primary-color="#9333EA"
 *   data-greeting="Hi! How can we help?"
 *   data-company-name="Acme Support"
 *   data-theme="auto"
 *   data-agent-name="Nova"
 *   data-agent-avatar-url="/widget/nova-avatar.png"
 * ></script>
 */
(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.csWidget) {
    console.warn('CS Widget already initialized');
    return;
  }

  // Configuration
  var WIDGET_ID = 'cs-widget-iframe';
  var CONTAINER_ID = 'cs-widget-container';

  // Get script element and extract config
  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf('loader.js') > -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  if (!script) {
    console.error('CS Widget: Could not find script element');
    return;
  }

  // Get base URL from script src
  var scriptSrc = script.src;
  var baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/widget/loader.js'));

  // Extract configuration from data attributes
  var config = {
    position: script.getAttribute('data-position') || 'bottom-right',
    primaryColor: script.getAttribute('data-primary-color') || '#4F46E5',
    greeting: script.getAttribute('data-greeting') || 'Hi! How can we help you today?',
    companyName: script.getAttribute('data-company-name') || 'Support',
    theme: script.getAttribute('data-theme') || 'auto',
    zIndex: parseInt(script.getAttribute('data-z-index') || '999999', 10),
    agentName: script.getAttribute('data-agent-name') || 'Nova',
    agentAvatarUrl: script.getAttribute('data-agent-avatar-url') || ''
  };

  // State
  var isOpen = false;
  var isReady = false;
  var iframe = null;
  var container = null;
  var pendingMessages = [];
  var eventListeners = {};

  // Utility: Check if mobile
  function isMobile() {
    return window.innerWidth < 640;
  }

  // Create iframe container and iframe
  function createWidget() {
    // Create container
    container = document.createElement('div');
    container.id = CONTAINER_ID;

    // Start with teaser-friendly size (transparent, pointer-events passthrough)
    var side = config.position === 'bottom-left' ? 'left' : 'right';
    container.style.cssText = [
      'position: fixed',
      'z-index: ' + config.zIndex,
      'transition: all 0.3s ease',
      side + ': 20px',
      'bottom: 20px',
      'width: 340px',
      'height: 100px',
      'border: none',
      'overflow: visible',
      'border-radius: 0',
      'background: transparent',
      'box-shadow: none',
      'pointer-events: none'
    ].join('; ');

    // Create iframe
    iframe = document.createElement('iframe');
    iframe.id = WIDGET_ID;
    iframe.title = 'Customer Support Widget';
    iframe.allow = 'clipboard-read; clipboard-write';
    iframe.style.cssText = [
      'width: 100%',
      'height: 100%',
      'border: none',
      'background: transparent',
      'pointer-events: auto'
    ].join('; ');

    // Build iframe URL with config params
    var params = new URLSearchParams();
    params.set('position', config.position);
    params.set('primaryColor', config.primaryColor);
    params.set('greeting', config.greeting);
    params.set('companyName', config.companyName);
    params.set('theme', config.theme);
    params.set('agentName', config.agentName);
    if (config.agentAvatarUrl) {
      params.set('agentAvatarUrl', config.agentAvatarUrl);
    }

    iframe.src = baseUrl + '/widget?' + params.toString();

    container.appendChild(iframe);
    document.body.appendChild(container);
  }

  // Update container size based on state
  function updateContainerSize() {
    if (!container) return;

    var side = config.position === 'bottom-left' ? 'left' : 'right';
    var otherSide = config.position === 'bottom-left' ? 'right' : 'left';

    if (!isOpen) {
      // Collapsed: teaser-friendly transparent container
      container.style.width = '340px';
      container.style.height = '100px';
      container.style.borderRadius = '0';
      container.style.boxShadow = 'none';
      container.style.background = 'transparent';
      container.style.bottom = '20px';
      container.style[side] = '20px';
      container.style[otherSide] = 'auto';
      container.style.top = 'auto';
      container.style.pointerEvents = 'none';
      container.style.overflow = 'visible';
      if (iframe) {
        iframe.style.pointerEvents = 'auto';
      }
    } else if (isMobile()) {
      // Full screen on mobile
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.borderRadius = '0';
      container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      container.style.background = 'white';
      container.style.bottom = '0';
      container.style.left = '0';
      container.style.right = '0';
      container.style.top = '0';
      container.style.pointerEvents = 'auto';
      container.style.overflow = 'hidden';
      if (iframe) {
        iframe.style.pointerEvents = 'auto';
      }
    } else {
      // Expanded on desktop
      container.style.width = '400px';
      container.style.height = '600px';
      container.style.borderRadius = '16px';
      container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      container.style.background = 'white';
      container.style.bottom = '20px';
      container.style[side] = '20px';
      container.style[otherSide] = 'auto';
      container.style.top = 'auto';
      container.style.pointerEvents = 'auto';
      container.style.overflow = 'hidden';
      if (iframe) {
        iframe.style.pointerEvents = 'auto';
      }
    }
  }

  // Send message to iframe
  function sendMessage(type, payload) {
    var message = { type: type, payload: payload };

    if (!isReady || !iframe || !iframe.contentWindow) {
      pendingMessages.push(message);
      return;
    }

    iframe.contentWindow.postMessage(message, baseUrl);
  }

  // Handle messages from iframe
  function handleMessage(event) {
    // Verify origin
    if (event.origin !== baseUrl) {
      return;
    }

    var data = event.data;
    if (!data || typeof data !== 'object' || !data.type) {
      return;
    }

    // Only handle widget messages
    if (!data.type.startsWith('widget:')) {
      return;
    }

    switch (data.type) {
      case 'widget:ready':
        isReady = true;
        // Send pending messages
        pendingMessages.forEach(function(msg) {
          iframe.contentWindow.postMessage(msg, baseUrl);
        });
        pendingMessages = [];
        // Trigger ready event
        triggerEvent('ready');
        break;

      case 'widget:open':
        isOpen = true;
        updateContainerSize();
        triggerEvent('open');
        break;

      case 'widget:close':
        isOpen = false;
        updateContainerSize();
        triggerEvent('close');
        break;

      case 'widget:resize':
        updateContainerSize();
        break;

      case 'widget:error':
        console.error('CS Widget Error:', data.payload);
        triggerEvent('error', data.payload);
        break;
    }
  }

  // Event system
  function triggerEvent(eventName, data) {
    var listeners = eventListeners[eventName] || [];
    listeners.forEach(function(callback) {
      try {
        callback(data);
      } catch (e) {
        console.error('CS Widget event handler error:', e);
      }
    });
  }

  // Public API
  window.csWidget = {
    // Open the widget
    open: function() {
      isOpen = true;
      updateContainerSize();
      sendMessage('widget:open');
    },

    // Close the widget
    close: function() {
      isOpen = false;
      updateContainerSize();
      sendMessage('widget:close');
    },

    // Toggle the widget
    toggle: function() {
      if (isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    // Pre-identify the customer
    identify: function(payload) {
      if (!payload || !payload.email) {
        console.error('CS Widget: identify requires an email');
        return;
      }
      sendMessage('widget:identify', payload);
    },

    // Update configuration
    setConfig: function(newConfig) {
      Object.assign(config, newConfig);
      sendMessage('widget:init', { config: newConfig });
    },

    // Check if widget is open
    isOpen: function() {
      return isOpen;
    },

    // Subscribe to events
    on: function(eventName, callback) {
      if (typeof callback !== 'function') return;
      if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
      }
      eventListeners[eventName].push(callback);
    },

    // Unsubscribe from events
    off: function(eventName, callback) {
      if (!eventListeners[eventName]) return;
      if (!callback) {
        eventListeners[eventName] = [];
        return;
      }
      eventListeners[eventName] = eventListeners[eventName].filter(function(cb) {
        return cb !== callback;
      });
    },

    // Destroy the widget
    destroy: function() {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('resize', updateContainerSize);
      iframe = null;
      container = null;
      isReady = false;
      isOpen = false;
    }
  };

  // Initialize
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        createWidget();
      });
    } else {
      createWidget();
    }

    // Listen for messages from iframe
    window.addEventListener('message', handleMessage);

    // Handle window resize
    window.addEventListener('resize', updateContainerSize);
  }

  init();
})();
