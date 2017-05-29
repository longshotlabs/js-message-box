import deepExtend from 'deep-extend';
import template from 'lodash.template';

class MessageBox {
  constructor({
    initialLanguage,
    messages,
    tracker,
    interpolate,
  } = {}) {
    this.language = initialLanguage || MessageBox.language || 'en';
    this.messageList = messages || {};
    if (tracker) this.trackerDep = new tracker.Dependency();

    // Default interpolate regex test
    // https://regex101.com/r/8sRC8b/2
    this.interpolate = interpolate || MessageBox.interpolate || /{{([^\{\}][\s\S]+?)}}/g;
  }

  messages(messages) {
    deepExtend(this.messageList, messages);
  }

  getMessages(language) {
    if (!language) {
      language = this.language;
      if (this.trackerDep) this.trackerDep.depend();
    }

    const globalMessages = MessageBox.messages[language];

    let messages = this.messageList[language];
    if (messages) {
      if (globalMessages) messages = deepExtend({}, globalMessages, messages);
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
    language,
    context,
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

    if (typeof message === 'string') message = template(message, { interpolate: this.interpolate });

    if (typeof message !== 'function') return `${fieldName} is invalid`;

    return message(fullContext);
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
    initialLanguage,
    messages,
    interpolate,
  } = {}) {
    if (typeof initialLanguage === 'string') MessageBox.language = initialLanguage;
    if (interpolate instanceof RegExp) MessageBox.interpolate = interpolate;

    if (messages) {
      if (!MessageBox.messages) MessageBox.messages = {};
      deepExtend(MessageBox.messages, messages);
    }
  }
}

export default MessageBox;
