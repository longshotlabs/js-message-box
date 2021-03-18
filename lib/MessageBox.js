import { render } from 'mustache';
import merge from './merge';

class MessageBox {
  constructor({
    initialLanguage,
    messages,
    tracker,
  } = {}) {
    this.language = initialLanguage || MessageBox.language || 'en';
    this.messageList = messages || {};

    if (tracker) {
      this.tracker = tracker;
      this.trackerDep = new tracker.Dependency();
    }
  }

  clone() {
    const copy = new MessageBox({
      initialLanguage: this.language,
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
      return render(message, fullContext);
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
    initialLanguage,
    messages,
  } = {}) {
    if (typeof initialLanguage === 'string') MessageBox.language = initialLanguage;

    if (messages) {
      if (!MessageBox.messages) MessageBox.messages = {};
      merge(MessageBox.messages, messages);
    }
  }
}

export default MessageBox;
