// ===============================
// Helpers: Interactable detection
// ===============================
function isInteractable(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName.toLowerCase();
  
    if (['input', 'button', 'select', 'textarea'].includes(tag)) {
      if (el.disabled) return false;
      return true;
    }
  
    if (tag === 'a' && el.hasAttribute('href')) return true;
  
    const role = el.getAttribute('role');
    if (role === 'button' || role === 'link') return true;
  
    if (el.isContentEditable) return true;
    if (el.hasAttribute('tabindex')) return true;
  
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
  
    return false;
  }
  
  // =================================
  // Helper: naming (camelCase + tag)
  // =================================
  function toFieldName(base, tagName) {
    tagName = (tagName || 'element').toLowerCase();
  
    if (!base || !base.trim()) {
      base = tagName + '_element';
    }
  
    let prefix = '';
    if (tagName === 'button') prefix = 'btn ';
    else if (tagName === 'input') prefix = 'input ';
    else if (tagName === 'select') prefix = 'ddl ';
    else if (tagName === 'textarea') prefix = 'txt ';
    else if (tagName === 'a') prefix = 'lnk ';
  
    base = prefix + base;
  
    let cleaned = base.replace(/[^a-zA-Z0-9_]+/g, ' ');
    let parts = cleaned.trim().split(/\s+/);
  
    if (parts.length === 0) {
      parts = [tagName, 'element'];
    }
  
    let result = '';
    parts.forEach((p, index) => {
      if (!p) return;
      p = p.toLowerCase();
      if (index === 0) {
        result += p;
      } else {
        result += p.charAt(0).toUpperCase() + p.slice(1);
      }
    });
  
    if (result && !/^[A-Za-z_]/.test(result)) {
      result = tagName + '_' + result;
    }
  
    result = result.replace(/[^a-zA-Z0-9_]/g, '');
    if (!result) {
      result = tagName + 'Element';
    }
    return result;
  }
  
  // ===================================
  // Helper: relative-ish XPath builder
  // ===================================
  function buildRelativeXPath(el) {
    if (!el || el.nodeType !== 1) return '';
  
    if (el.id) {
      const escaped = el.id.replace(/'/g, "\\'");
      return `.//*[@id='${escaped}']`;
    }
  
    const ancestorWithId = el.closest('[id]');
    if (ancestorWithId) {
      const containerId = ancestorWithId.id.replace(/'/g, "\\'");
      const parts = [];
  
      let current = el;
      while (current && current !== ancestorWithId && current.nodeType === 1) {
        const tag = current.tagName.toLowerCase();
  
        let index = 1;
        let sibling = current.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === current.tagName) {
            index++;
          }
          sibling = sibling.previousElementSibling;
        }
  
        parts.unshift(`${tag}[${index}]`);
        current = current.parentElement;
      }
  
      if (parts.length === 0) {
        return `.//*[@id='${containerId}']`;
      }
  
      return `.//*[@id='${containerId}']//` + parts.join('/');
    }
  
    const parts = [];
    let current = el;
    while (
      current &&
      current.nodeType === 1 &&
      current !== document.body &&
      current !== document.documentElement
    ) {
      const tag = current.tagName.toLowerCase();
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${tag}[${index}]`);
      current = current.parentElement;
    }
    return '//' + parts.join('/');
  }
  
  // ===============================
  // Helper: build primary locator
  // Priority for Option 2:
  // data-automation -> data-testid -> id -> name -> className CSS -> generic CSS -> XPath
  // ===============================
  function buildLocatorInfo(el) {
    const tagName = el.tagName ? el.tagName.toLowerCase() : 'element';
    const id = el.getAttribute('id');
    const nameAttr = el.getAttribute('name');
    const dataAutomation = el.getAttribute('data-automation');
    const dataTestId =
      el.getAttribute('data-testid') ||
      el.getAttribute('data-test') ||
      el.getAttribute('data-qa');
    const classAttr = el.className || '';
    const text = (el.innerText || el.textContent || '').trim();
  
    const relativeXPath = buildRelativeXPath(el);
  
    // 1. data-automation
    if (dataAutomation) {
      const css = `[data-automation='${dataAutomation.replace(/'/g, "\\'")}']`;
      return {
        name: toFieldName(dataAutomation, tagName),
        strategy: 'DATA_AUTOMATION',
        locatorValue: css,
        tagName,
        xpath: relativeXPath
      };
    }
  
    // 2. data-testid
    if (dataTestId) {
      const css = `[data-testid='${dataTestId.replace(/'/g, "\\'")}']`;
      return {
        name: toFieldName(dataTestId, tagName),
        strategy: 'DATA_TESTID',
        locatorValue: css,
        tagName,
        xpath: relativeXPath
      };
    }
  
    // 3. id
    if (id) {
      return {
        name: toFieldName(id, tagName),
        strategy: 'ID',
        locatorValue: id,
        tagName,
        xpath: relativeXPath
      };
    }
  
    // 4. name attribute
    if (nameAttr) {
      return {
        name: toFieldName(nameAttr, tagName),
        strategy: 'NAME',
        locatorValue: nameAttr,
        tagName,
        xpath: relativeXPath
      };
    }
  
    // 5. className -> CSS like tag.class1.class2
    const classes = classAttr
      .split(/\s+/)
      .map(c => c.trim())
      .filter(Boolean);
    if (classes.length > 0) {
      const css = `${tagName}.${classes.join('.')}`;
      return {
        name: toFieldName(classes.join('_'), tagName),
        strategy: 'CLASS_NAME',
        locatorValue: css,
        tagName,
        xpath: relativeXPath
      };
    }
  
    // 6. generic CSS based on tag + nth-of-type (rough fallback)
    const cssFallback = buildCssFallback(el);
    if (cssFallback) {
      return {
        name: toFieldName(tagName + '_element', tagName),
        strategy: 'CSS',
        locatorValue: cssFallback,
        tagName,
        xpath: relativeXPath
      };
    }
  
    // 7. Fallback: relative xpath
    return {
      name: toFieldName(tagName + '_element', tagName),
      strategy: 'XPATH',
      locatorValue: relativeXPath,
      tagName,
      xpath: relativeXPath
    };
  }
  
  // generic CSS fallback using nth-of-type
  function buildCssFallback(el) {
    if (!el || el.nodeType !== 1) return null;
    const tag = el.tagName.toLowerCase();
    let path = tag;
    let current = el;
  
    while (
      current &&
      current.parentElement &&
      current !== document.body &&
      current !== document.documentElement
    ) {
      const parent = current.parentElement;
      const siblings = Array.from(parent.children).filter(
        c => c.tagName === current.tagName
      );
      const index = siblings.indexOf(current);
      const nth = index >= 0 ? `:nth-of-type(${index + 1})` : '';
      path = `${current.tagName.toLowerCase()}${nth} > ${path}`;
      current = parent;
      if (parent.id) {
        path = `#${parent.id} > ${path}`;
        break;
      }
    }
  
    return path;
  }
  
  // =======================================
  // Helper: collect all "stable" locators
  // in order: data-automation, data-testid, id, name, class, css, xpath
  // =======================================
  function buildAllLocators(el) {
    const tagName = el.tagName ? el.tagName.toLowerCase() : 'element';
    const id = el.getAttribute('id');
    const nameAttr = el.getAttribute('name');
    const dataAutomation = el.getAttribute('data-automation');
    const dataTestId =
      el.getAttribute('data-testid') ||
      el.getAttribute('data-test') ||
      el.getAttribute('data-qa');
    const classAttr = el.className || '';
    const text = (el.innerText || el.textContent || '').trim();
    const relativeXPath = buildRelativeXPath(el);
  
    let cssDataAutomation = null;
    if (dataAutomation) {
      cssDataAutomation = `[data-automation="${dataAutomation.replace(/"/g, '\\"')}"]`;
    }
  
    let cssDataTestId = null;
    if (dataTestId) {
      cssDataTestId = `[data-testid="${dataTestId.replace(/"/g, '\\"')}"]`;
    }
  
    let cssByClass = null;
    const classes = classAttr
      .split(/\s+/)
      .map(c => c.trim())
      .filter(Boolean);
    if (classes.length > 0) {
      cssByClass = `${tagName}.${classes.join('.')}`;
    }
  
    const cssGeneric = buildCssFallback(el);
  
    let textXPath = null;
    if (text && text.length <= 40) {
      const normalized = text.replace(/'/g, "\\'");
      textXPath = `.//${tagName}[normalize-space()='${normalized}']`;
    }
  
    return {
      dataAutomation,
      dataTestId,
      id,
      nameAttr,
      classAttr,
      cssDataAutomation,
      cssDataTestId,
      cssByClass,
      cssGeneric,
      text,
      textXPath,
      relativeXPath
    };
  }
  
  // =================================
  // Java @FindBy annotation builder
  // (used in Option 1)
  // =================================
  function buildFindByAnnotation(info) {
    const value = info.locatorValue
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
  
    switch (info.strategy) {
      case 'ID':
        return `@FindBy(id = "${value}")`;
      case 'NAME':
        return `@FindBy(name = "${value}")`;
      case 'DATA_AUTOMATION':
      case 'DATA_TESTID':
      case 'CLASS_NAME':
      case 'CSS':
        return `@FindBy(css = "${value}")`;
      case 'XPATH':
      default:
        return `@FindBy(xpath = "${value}")`;
    }
  }
  
  // =======================
  // Option 1: Page Object
  // =======================
  function generatePageObject(packageName, className) {
    console.log(
      '[LocatorTool] Generating Page Object (interactable elements only)...'
    );
  
    const raw = Array.from(
      document.querySelectorAll(
        'a[href], button, input, select, textarea, [role="button"], [role="link"], [contenteditable="true"], [tabindex]'
      )
    );
    const elements = raw.filter(isInteractable);
  
    const unique = new Map();
  
    for (const el of elements) {
      try {
        const info = buildLocatorInfo(el);
        if (!info) continue;
  
        const key = `${info.strategy}:${info.locatorValue}`;
        if (!unique.has(key)) {
          unique.set(key, info);
        }
      } catch (e) {
        // ignore
      }
    }
  
    const locatorInfos = Array.from(unique.values());
  
    let sb = '';
  
    if (packageName && packageName.trim()) {
      sb += `package ${packageName};\n\n`;
    }
  
    sb += 'import org.openqa.selenium.WebDriver;\n';
    sb += 'import org.openqa.selenium.WebElement;\n';
    sb += 'import org.openqa.selenium.support.FindBy;\n';
    sb += 'import org.openqa.selenium.support.PageFactory;\n\n';
  
    sb += `public class ${className} {\n\n`;
    sb += '    private final WebDriver driver;\n\n';
    sb += `    public ${className}(WebDriver driver) {\n`;
    sb += '        this.driver = driver;\n';
    sb += '        PageFactory.initElements(driver, this);\n';
    sb += '    }\n\n';
  
    locatorInfos.forEach(info => {
      sb += '    ' + buildFindByAnnotation(info) + '\n';
      sb += `    private WebElement ${info.name};\n\n`;
    });
  
    locatorInfos.forEach(info => {
      const methodName =
        'get' + info.name.charAt(0).toUpperCase() + info.name.slice(1);
      sb += `    public WebElement ${methodName}() {\n`;
      sb += `        return ${info.name};\n`;
      sb += '    }\n\n';
    });
  
    sb += '}\n';
  
    const blob = new Blob([sb], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = className + '.java';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  
    alert(
      `Java Page Object generated for ${locatorInfos.length} unique interactable elements.\nFile: ${className}.java`
    );
  }
  
  // ==================================
  // Option 2: Groovy / Playwright text
  // ==================================
  function toGroovy(info) {
    const val = info.locatorValue
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    switch (info.strategy) {
      case 'ID':
        return `// Groovy (Selenide)\n$(By.id("${val}"))`;
      case 'NAME':
        return `// Groovy (Selenide)\n$(By.name("${val}"))`;
      case 'DATA_AUTOMATION':
      case 'DATA_TESTID':
      case 'CLASS_NAME':
      case 'CSS':
        return `// Groovy (Selenide)\n$(By.cssSelector("${val}"))`;
      case 'XPATH':
      default:
        return `// Groovy (Selenide)\n$(By.xpath("${val}"))`;
    }
  }
  
  function toPlaywright(info) {
    switch (info.strategy) {
      case 'ID': {
        const selector =
          '#' +
          info.locatorValue.replace(/"/g, '\\"').replace(/ /g, '\\ ');
        return `// Playwright (TS/JS)\npage.locator("${selector}");`;
      }
      case 'NAME': {
        const selector = `[name='${info.locatorValue.replace(/'/g, "\\'")}']`;
        return `// Playwright (TS/JS)\npage.locator("${selector}");`;
      }
      case 'DATA_AUTOMATION':
      case 'DATA_TESTID':
      case 'CLASS_NAME':
      case 'CSS': {
        const selector = info.locatorValue
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"');
        return `// Playwright (TS/JS)\npage.locator("${selector}");`;
      }
      case 'XPATH':
      default: {
        const selector = ('xpath=' + info.locatorValue)
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"');
        return `// Playwright (TS/JS)\npage.locator("${selector}");`;
      }
    }
  }
  
  // ===============================
  // Option 2: Copy helper
  // ===============================
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(err =>
        console.error('[LocatorTool] Clipboard error:', err)
      );
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        console.error('[LocatorTool] execCommand copy failed', e);
      }
      document.body.removeChild(textarea);
    }
  }
  
  // ===============================
  // Option 2: Result panel UI
  // ===============================
  function addSection(panel, titleText, codeText) {
    if (!codeText) return;
  
    const container = document.createElement('div');
    container.style.marginBottom = '8px';
  
    const header = document.createElement('div');
    header.textContent = titleText;
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '2px';
  
    const pre = document.createElement('pre');
    pre.textContent = codeText;
    pre.style.whiteSpace = 'pre-wrap';
  
    const button = document.createElement('button');
    button.textContent = 'Copy';
    button.style.marginTop = '2px';
    button.style.fontSize = '11px';
    button.style.cursor = 'pointer';
  
    button.onclick = () => {
      copyToClipboard(codeText);
      const old = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => (button.textContent = old), 1000);
    };
  
    container.appendChild(header);
    container.appendChild(pre);
    container.appendChild(button);
  
    panel.appendChild(container);
  }
  
  function showLocatorPanel(info, el) {
    const existing = document.getElementById('locator-tool-panel');
    if (existing) existing.remove();
  
    const all = buildAllLocators(el);
    const groovySnippet = toGroovy(info);
    const playwrightSnippet = toPlaywright(info);
  
    const panel = document.createElement('div');
    panel.id = 'locator-tool-panel';
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.zIndex = '999999';
    panel.style.background = 'rgba(0,0,0,0.92)';
    panel.style.color = '#fff';
    panel.style.padding = '8px';
    panel.style.borderRadius = '4px';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.width = '440px';
    panel.style.maxHeight = '80vh';
    panel.style.overflow = 'auto';
    panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';
  
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.float = 'right';
    closeBtn.style.marginBottom = '6px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => panel.remove();
  
    const title = document.createElement('div');
    title.textContent = 'Locator Tool – Selection Result';
    title.style.marginBottom = '6px';
    title.style.fontWeight = 'bold';
  
    panel.appendChild(closeBtn);
    panel.appendChild(title);
  
    // Order: data-automation, data-testid, id, name, class, css, xpath
    addSection(
      panel,
      'data-automation (By.cssSelector)',
      all.cssDataAutomation
        ? `By.cssSelector("${all.cssDataAutomation}")`
        : null
    );
    addSection(
      panel,
      'data-testid (By.cssSelector)',
      all.cssDataTestId ? `By.cssSelector("${all.cssDataTestId}")` : null
    );
    addSection(
      panel,
      'By.id (Java/Selenium)',
      all.id ? `By.id("${all.id.replace(/"/g, '\\"')}")` : null
    );
    addSection(
      panel,
      'By.name (Java/Selenium)',
      all.nameAttr ? `By.name("${all.nameAttr.replace(/"/g, '\\"')}")` : null
    );
    addSection(
      panel,
      'CSS (class-based)',
      all.cssByClass
    );
    addSection(
      panel,
      'CSS (generic)',
      all.cssGeneric
    );
  
    addSection(panel, 'Relative XPath (primary)', all.relativeXPath);
    addSection(panel, 'Text-based XPath', all.textXPath);
  
    addSection(panel, 'Groovy (Selenide)', groovySnippet);
    addSection(panel, 'Playwright (TS/JS)', playwrightSnippet);
  
    document.body.appendChild(panel);
  }
  
  // =======================
  // Option 2: Picker logic
  // =======================
  let pickerActive = false;
  let highlightEl = null;
  
  function onMouseMove(e) {
    const el = e.target;
    if (highlightEl && highlightEl !== el) {
      highlightEl.style.outline = '';
    }
    highlightEl = el;
    if (el && el.style) {
      el.style.outline = '2px solid red';
    }
  }
  
  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
  
    pickerActive = false;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
  
    if (highlightEl) {
      highlightEl.style.outline = '';
    }
  
    const el = e.target;
    const info = buildLocatorInfo(el);
    showLocatorPanel(info, el);
  }
  
  function startCursorPicker() {
    console.log('[LocatorTool] START_CURSOR_PICKER');
    if (pickerActive) {
      pickerActive = false;
      if (highlightEl) {
        highlightEl.style.outline = '';
        highlightEl = null;
      }
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      return;
    }
  
    pickerActive = true;
    alert(
      'Cursor picker enabled.\nHover an element (it will be outlined in red) and click to capture all locators.'
    );
  
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
  }
  
  // =======================
  // Message listener
  // =======================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[LocatorTool] Message received:', message);
    if (message.type === 'GENERATE_PAGE_OBJECT') {
      generatePageObject(message.packageName, message.className);
    } else if (message.type === 'START_CURSOR_PICKER') {
      startCursorPicker();
    }
  });