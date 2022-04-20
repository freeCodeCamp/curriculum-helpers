const getIsDeclaredAfter = (styleRule) => (selector) => {
  const cssStyleRules = Array.from(
    styleRule.parentStyleSheet?.cssRules || []
  )?.filter((ele) => ele.type === CSSRule.STYLE_RULE);
  const previousStyleRule = cssStyleRules.find(
    (ele) => ele?.selectorText === selector
  );
  if (!previousStyleRule) return false;
  const currPosition = Array.from(
    styleRule.parentStyleSheet?.cssRules || []
  ).indexOf(styleRule);
  const prevPosition = Array.from(
    previousStyleRule?.parentStyleSheet?.cssRules || []
  ).indexOf(previousStyleRule);
  return currPosition > prevPosition;
};

class CSSHelp {
  doc;
  constructor(doc) {
    this.doc = doc;
  }
  _getStyleRules() {
    const styleSheet = this.getStyleSheet();
    return this.styleSheetToCssRulesArray(styleSheet).filter(
      (ele) => ele.type === CSSRule.STYLE_RULE
    );
  }

  getStyleDeclarations(selector) {
    return this._getStyleRules()
      ?.filter((ele) => ele?.selectorText === selector)
      .map((x) => x.style);
  }
  getStyle(selector) {
    const style = this._getStyleRules().find(
      (ele) => ele?.selectorText === selector
    )?.style;
    if (!style) return null;
    style.getPropVal = (prop, strip = false) => {
      return strip
        ? style.getPropertyValue(prop).replace(/\s+/g, "")
        : style.getPropertyValue(prop);
    };
    return style;
  }
  getStyleRule(selector) {
    const styleRule = this._getStyleRules()?.find(
      (ele) => ele?.selectorText === selector
    );
    if (styleRule) {
      return {
        ...styleRule,
        isDeclaredAfter: (selector) => getIsDeclaredAfter(styleRule)(selector),
      };
    } else {
      return null;
    }
  }
  getCSSRules(element) {
    const styleSheet = this.getStyleSheet();
    const cssRules = this.styleSheetToCssRulesArray(styleSheet);
    switch (element) {
      case "media":
        return cssRules.filter((ele) => ele.type === CSSRule.MEDIA_RULE);
      case "fontface":
        return cssRules.filter((ele) => ele.type === CSSRule.FONT_FACE_RULE);
      case "import":
        return cssRules.filter((ele) => ele.type === CSSRule.IMPORT_RULE);
      case "keyframes":
        return cssRules.filter((ele) => ele.type === CSSRule.KEYFRAMES_RULE);
      default:
        return cssRules;
    }
  }
  isPropertyUsed(property) {
    return this._getStyleRules().some((ele) =>
      ele.style?.getPropertyValue(property)
    );
  }
  getRuleListsWithinMedia(mediaText) {
    const medias = this.getCSSRules("media");
    const cond = medias?.find((x) => x?.media?.mediaText === mediaText);
    const cssRules = cond?.cssRules;
    return Array.from(cssRules || []);
  }
  getStyleSheet() {
    // TODO: Change selector to match exactly 'styles.css'
    const link = this.doc?.querySelector("link[href*='styles']");
    // Most* browser extensions inject styles with class/media attributes
    const style = this.doc?.querySelector("style:not([class]):not([media])");
    if (link?.sheet?.cssRules?.length) {
      return link.sheet;
    } else if (style) {
      return style.sheet;
    } else {
      return null;
    }
  }
  styleSheetToCssRulesArray(styleSheet) {
    return Array.from(styleSheet?.cssRules || []);
  }
}

export default CSSHelp;
