var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-emobility-tool.js
  var import_emobility_tool_exports = {};
  __export(import_emobility_tool_exports, {
    default: () => import_emobility_tool_default
  });

  // tools/importer/parsers/hero-stage.js
  function parse(element, { document }) {
    let img = element.querySelector('img[src^="http"]');
    if (!img) {
      const source = element.querySelector("picture source[srcset]");
      if (source) {
        img = document.createElement("img");
        img.src = source.getAttribute("srcset").split(" ")[0];
        img.alt = (element.querySelector("picture img") || {}).alt || "";
      }
    }
    if (!img) {
      const placeholder = element.querySelector('img[class*="Image-sc"]');
      if (placeholder) {
        img = document.createElement("img");
        img.alt = placeholder.alt || "";
        img.src = "";
      }
    }
    const heading = element.querySelector('h1, h2, [class*="headingElement"] h1, [class*="headingElement"] h2');
    const ctaLink = element.querySelector('[class*="buttonElement"] a, a[class*="StyledButton"]');
    const imageCell = [];
    const frag1 = document.createDocumentFragment();
    frag1.appendChild(document.createComment(" field:image "));
    if (img) {
      const picture = document.createElement("picture");
      const imgEl = document.createElement("img");
      imgEl.src = img.src || "";
      imgEl.alt = img.alt || "";
      picture.appendChild(imgEl);
      frag1.appendChild(picture);
    }
    imageCell.push(frag1);
    const textCell = [];
    const frag2 = document.createDocumentFragment();
    frag2.appendChild(document.createComment(" field:text "));
    if (heading) {
      const h = document.createElement("h1");
      h.textContent = heading.textContent.trim();
      frag2.appendChild(h);
    }
    if (ctaLink) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = ctaLink.href;
      a.textContent = ctaLink.textContent.trim();
      p.appendChild(a);
      frag2.appendChild(p);
    }
    textCell.push(frag2);
    const cells = [imageCell, textCell];
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-stage", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/embed-search.js
  function parse2(element, { document }) {
    const searchLink = element.querySelector(
      'a[href*="modelle"], a[href*="autosuche"], a[href*="konfigurator"], a[href*="verfuegbare-fahrzeuge"], a[href*="simulator"], a[href*="rechner"], a[class*="StyledButton"], a[class*="StyledLink"]'
    );
    const contentCell = document.createDocumentFragment();
    contentCell.appendChild(document.createComment(" field:embed_placeholder "));
    contentCell.appendChild(document.createComment(" field:embed_uri "));
    if (searchLink) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = searchLink.href;
      a.textContent = searchLink.textContent.trim() || searchLink.href;
      p.appendChild(a);
      contentCell.appendChild(p);
    } else {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = "https://www.volkswagen.de/de/modelle/verfuegbare-fahrzeuge.html";
      a.textContent = "Fahrzeugsuche";
      p.appendChild(a);
      contentCell.appendChild(p);
    }
    const cells = [[contentCell]];
    const block = WebImporter.Blocks.createBlock(document, { name: "embed-search", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-teaser.js
  function parse3(element, { document }) {
    const columnCells = [];
    const textTeasers = element.querySelectorAll('[class*="xfTextOnlyTeaser"]');
    const isFocusTeaser = element.classList.contains("focusTeaserSection") || element.querySelector('[class*="focusTeaserSection"]') || element.querySelector('[class*="focus-teaser__"]');
    if (textTeasers.length > 0) {
      textTeasers.forEach((teaser) => {
        columnCells.push(extractTextContent(teaser, document));
      });
    } else if (isFocusTeaser) {
      const mediaWrapper = element.querySelector('[class*="StyledMediaElementWrapper"], [class*="StyledFocusTeaserWrapper"] > div:first-child');
      const textWrapper = element.querySelector('[class*="StyledTeaserTextWrapper"], [class*="StyledFocusTeaserWrapper"] > div:last-child');
      const imgCell = document.createDocumentFragment();
      if (mediaWrapper) {
        const img = mediaWrapper.querySelector('img[src^="http"], img[alt]');
        if (img) {
          const picture = document.createElement("picture");
          const imgEl = document.createElement("img");
          imgEl.src = img.src || "";
          imgEl.alt = img.alt || "";
          picture.appendChild(imgEl);
          imgCell.appendChild(picture);
        }
        const imageLink = mediaWrapper.querySelector("a[href]");
        if (imageLink && !img) {
          const p = document.createElement("p");
          const a = document.createElement("a");
          a.href = imageLink.href;
          a.textContent = imageLink.textContent.trim() || "Link";
          p.appendChild(a);
          imgCell.appendChild(p);
        }
      }
      columnCells.push(imgCell);
      if (textWrapper) {
        columnCells.push(extractTextContent(textWrapper, document));
      } else {
        columnCells.push(extractTextContent(element, document));
      }
    } else {
      const headings = element.querySelectorAll("h2, h3");
      if (headings.length >= 2) {
        headings.forEach((h) => {
          const parent = h.closest('[class*="EditableComponent"]') || h.parentElement;
          columnCells.push(extractTextContent(parent, document));
        });
      } else {
        columnCells.push(extractTextContent(element, document));
        columnCells.push(document.createDocumentFragment());
      }
    }
    const cells = columnCells.length > 0 ? [columnCells] : [["", ""]];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-teaser", cells });
    element.replaceWith(block);
  }
  function extractTextContent(container, document) {
    const cell = document.createDocumentFragment();
    const heading = container.querySelector('[class*="headingElement"] h2, [class*="headingElement"] h3, h2, h3');
    if (heading) {
      const h = document.createElement("h3");
      h.textContent = heading.textContent.trim();
      cell.appendChild(h);
    }
    const paragraphs = container.querySelectorAll(
      '[class*="richtextFullElement"] p, [class*="richtextSimpleElement"] p, [class*="copyItem"] p'
    );
    paragraphs.forEach((p) => {
      const newP = document.createElement("p");
      newP.textContent = p.textContent.trim();
      if (newP.textContent) cell.appendChild(newP);
    });
    const link = container.querySelector(
      '[class*="linkElement"] a, a[class*="StyledLink"]:not([class*="image-link"])'
    );
    if (link) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = link.href;
      a.textContent = link.textContent.trim();
      p.appendChild(a);
      cell.appendChild(p);
    }
    return cell;
  }

  // tools/importer/transformers/vw-cleanup.js
  var H = { before: "beforeTransform", after: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === H.before) {
      WebImporter.DOMUtils.remove(element, [
        "#cookiemgmt",
        "#ensWrapper",
        '[id*="onetrust"]',
        '[class*="cookie"]'
      ]);
      WebImporter.DOMUtils.remove(element, [
        '[class*="StyledSkipWrapper"]'
      ]);
      WebImporter.DOMUtils.remove(element, [
        '[class*="StyledLayerWrapper"]'
      ]);
    }
    if (hookName === H.after) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        'nav[class*="SSRNavigation"]',
        '[class*="TopBar__"]'
      ]);
      WebImporter.DOMUtils.remove(element, [
        "footer"
      ]);
      WebImporter.DOMUtils.remove(element, [
        '[class*="StyledReferenceBadge"]',
        '[class*="ImageDisclaimerReferences"]',
        '[class*="OverlayDisclaimerContainers__StyledOverlay"]',
        '[class*="StyledSup"]',
        "sup"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "iframe",
        "noscript",
        "link"
      ]);
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("data-track");
        el.removeAttribute("data-testid");
        el.removeAttribute("onclick");
      });
    }
  }

  // tools/importer/transformers/vw-sections.js
  var H2 = { before: "beforeTransform", after: "afterTransform" };
  function transform2(hookName, element, payload) {
    if (hookName === H2.after) {
      const { template } = payload;
      if (!template || !template.sections || template.sections.length < 2) return;
      const document = element.ownerDocument;
      const sections = template.sections;
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
        let sectionEl = null;
        for (const sel of selectors) {
          try {
            sectionEl = element.querySelector(sel);
            if (sectionEl) break;
          } catch (e) {
          }
        }
        if (!sectionEl) continue;
        if (section.style) {
          const sectionMetadataBlock = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          sectionEl.after(sectionMetadataBlock);
        }
        if (i > 0) {
          const hr = document.createElement("hr");
          sectionEl.before(hr);
        }
      }
    }
  }

  // tools/importer/import-emobility-tool.js
  var PAGE_TEMPLATE = {
    "name": "emobility-tool",
    "urls": [
      "https://www.volkswagen.de/de/elektromobilitaet/laden/ladezeitensimulator.html",
      "https://www.volkswagen.de/de/elektromobilitaet/e-tools-fuer-elektroautos/kostensimulator.html",
      "https://www.volkswagen.de/de/elektromobilitaet/e-tools-fuer-elektroautos/ladezeitsimulator.html",
      "https://www.volkswagen.de/de/elektromobilitaet/e-tools-fuer-elektroautos/reichweitensimulator.html"
    ],
    "description": "Interactive e-tools pages with embedded simulators and calculators for cost, charging time, and range",
    "blocks": [
      {
        "name": "hero-stage",
        "instances": [
          ".basicStageSection"
        ]
      },
      {
        "name": "embed-search",
        "instances": [
          ".featureAppSection"
        ]
      },
      {
        "name": "columns-teaser",
        "instances": [
          ".focusTeaserSection",
          ".textOnlyTeaserSection"
        ]
      }
    ]
  };
  var parsers = {
    "hero-stage": parse,
    "embed-search": parse2,
    "columns-teaser": parse3
  };
  var transformers = [
    transform,
    transform2
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element) => {
            pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
          });
        } catch (e) {
          console.warn(`Invalid selector for block "${blockDef.name}": ${selector}`);
        }
      });
    });
    return pageBlocks;
  }
  var import_emobility_tool_default = {
    transform: (payload) => {
      const { document, url, html, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name}:`, e);
          }
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{ element: main, path, report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) } }];
    }
  };
  return __toCommonJS(import_emobility_tool_exports);
})();
