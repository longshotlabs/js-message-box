import template from 'lodash.template';
import merge from 'deep-extend';

// Default lodash templates regexs
// https://regex101.com/r/ce27tA/5
export const DEFAULT_INTERPOLATE = /{{{([^{}#][\s\S]+?)}}}/g;
// https://regex101.com/r/8sRC8b/8
export const DEFAULT_ESCAPE = /{{([^{}#][\s\S]+?)}}/g;
// https://regex101.com/r/ndDqxg/4
export const SUGGESTED_EVALUATE = /{{#([^{}].*?)}}/g;

class MessageBox {
  constructor({
    escape,
    evaluate,
    initialLanguage,
    interpolate,
    messages,
    tracker,
  } = {}) {
    this.language = initialLanguage || MessageBox.language || 'en';
    this.messageList = messages || {};

    if (tracker) {
      this.tracker = tracker;
      this.trackerDep = new tracker.Dependency();
    }

    // Template options
    this.interpolate = interpolate || MessageBox.interpolate || DEFAULT_INTERPOLATE;
    this.evaluate = evaluate || MessageBox.evaluate;
    this.escape = escape || MessageBox.escape || DEFAULT_ESCAPE;
  }

  clone() {
    const copy = new MessageBox({
      escape: this.escape,
      evaluate: this.evaluate,
      initialLanguage: this.language,
      interpolate: this.interpolate,
      tracker: this.tracker,
    });
    copy.messages(this.messageList);
    return copy;
  }

  getMessages(language) {
    if (!language) {
      language = this.language;
      if (this.trackerDep) this.trackerDep.depend();
    }

    const globalMessages = MessageBox.messages[language];

    let messages = this.messageList[language];
    if (messages) {
      if (globalMessages) messages = merge({}, globalMessages, messages);
    } else {
      messages = globalMessages;
    }

    if (!messages) throw new Error(`No messages found for language "${language}"`);

    return {
      messages,
      language,
    };
  }

  message(errorInfo, {
    context,
    language,
  } = {}) {
    // Error objects can optionally include a preformatted message,
    // in which case we use that.
    if (errorInfo.message) return errorInfo.message;

    const fieldName = errorInfo.name;
    const genericName = MessageBox.makeNameGeneric(fieldName);

    const { messages } = this.getMessages(language);
    let message = messages[errorInfo.type];

    const fullContext = {
      genericName,
      ...context,
      ...errorInfo,
    };

    if (message && typeof message === 'object') message = message[genericName] || message._default; // eslint-disable-line no-underscore-dangle

    if (typeof message === 'string') {
      message = template(message, {
        interpolate: this.interpolate,
        evaluate: this.evaluate,
        escape: this.escape,
      });
    }

    if (typeof message !== 'function') return `${fieldName} is invalid`;

    return message(fullContext);
  }

  messages(messages) {
    merge(this.messageList, messages);
  }

  setLanguage(language) {
    this.language = language;
    if (this.trackerDep) this.trackerDep.changed();
  }

  static makeNameGeneric(name) {
    if (typeof name !== 'string') return null;
    return name.replace(/\.[0-9]+(?=\.|$)/g, '.$');
  }

  static messages = {};

  static defaults({
    escape,
    evaluate,
    initialLanguage,
    interpolate,
    messages,
  } = {}) {
    if (typeof initialLanguage === 'string') MessageBox.language = initialLanguage;

    if (interpolate instanceof RegExp) MessageBox.interpolate = interpolate;
    if (evaluate instanceof RegExp) MessageBox.evaluate = evaluate;
    if (escape instanceof RegExp) MessageBox.escape = escape;

    if (messages) {
      if (!MessageBox.messages) MessageBox.messages = {};
      merge(MessageBox.messages, messages);
    }
  }
}

export default MessageBox;
