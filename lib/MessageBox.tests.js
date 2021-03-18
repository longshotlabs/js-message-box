/* eslint-disable func-names, prefer-arrow-callback */

import expect, { createSpy } from 'expect';
import MessageBox from './MessageBox';

describe('MessageBox', function () {
  it('getting a message in the default language works', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          required: 'It is required',
        },
      },
    });

    expect(messageBox.message({
      name: 'foo',
      type: 'required',
    })).toBe('It is required');
  });

  it('getting a message in another language works', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          required: 'It is required',
        },
        'es-ES': {
          required: 'Es requerido',
        },
      },
    });

    messageBox.setLanguage('es-ES');

    expect(messageBox.message({
      name: 'foo',
      type: 'required',
    })).toBe('Es requerido');
  });

  it('throws an error if there are no messages for a language', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          required: 'It is required',
        },
      },
    });

    messageBox.setLanguage('es-ES');

    expect(() => {
      messageBox.message({
        name: 'foo',
        type: 'required',
      });
    }).toThrow();
  });

  it('passing a language to `message` works', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          required: 'It is required',
        },
        'es-ES': {
          required: 'Es requerido',
        },
      },
    });

    expect(messageBox.message({
      name: 'foo',
      type: 'required',
    }, { language: 'es-ES' })).toBe('Es requerido');
  });

  it('template in messages works', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          required: '{{{name}}} is required',
          number: '{{name}} is not a number',
        },
      },
    });

    expect(messageBox.message({
      name: 'foo',
      type: 'required',
    })).toBe('foo is required');

    expect(messageBox.message({
      name: 'bar',
      type: 'number',
    })).toBe('bar is not a number');
  });

  it('template in messages with html works', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          minNumber: '<strong>{{{name}}}</strong> must be at least {{min}}',
          maxNumber: '<div id="field">{{name}}</div> cannot exceed {{max}}',
        },
      },
    });

    expect(messageBox.message({
      name: '<bar>',
      type: 'minNumber',
      min: 10,
    })).toBe('<strong><bar></strong> must be at least 10');

    expect(messageBox.message({
      name: '<bar>',
      type: 'maxNumber',
      max: 100,
    })).toBe('<div id="field">&lt;bar&gt;</div> cannot exceed 100');
  });

  it('uses the message on error info if provided', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          required: 'It is required',
        },
      },
    });

    expect(messageBox.message({
      name: 'foo',
      type: 'required',
      message: 'This one',
    })).toBe('This one');
  });

  it('per-field messages', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          required: {
            _default: 'DEFAULT',
            foo: 'FOO',
          },
        },
      },
    });

    expect(messageBox.message({
      name: 'foo',
      type: 'required',
    })).toBe('FOO');

    expect(messageBox.message({
      name: 'foo2',
      type: 'required',
    })).toBe('DEFAULT');
  });

  it('per-field messages with array field', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          required: {
            _default: 'DEFAULT',
            'foo.$.bar': 'FOO',
          },
        },
      },
    });

    expect(messageBox.message({
      name: 'foo.2.bar',
      type: 'required',
    })).toBe('FOO');

    expect(messageBox.message({
      name: 'foo2.$.bar',
      type: 'required',
    })).toBe('DEFAULT');
  });

  it('falls back to global defaults', function () {
    MessageBox.defaults({
      messages: {
        en: {
          required: 'It is required',
        },
      },
    });

    const messageBox = new MessageBox();

    expect(messageBox.message({
      name: 'foo',
      type: 'required',
    })).toBe('It is required');

    MessageBox.messages = {}; // Reset
  });

  it('global initial language works', function () {
    MessageBox.defaults({
      initialLanguage: 'es-ES',
    });

    const messageBox = new MessageBox({
      messages: {
        en: {
          required: 'It is required',
        },
        'es-ES': {
          required: 'Es requerido',
        },
      },
    });

    expect(messageBox.message({
      name: 'foo',
      type: 'required',
    })).toBe('Es requerido');

    MessageBox.language = null;
  });

  it('message function is called', function () {
    const spy = createSpy();

    const messageBox = new MessageBox({
      messages: {
        en: {
          required: spy,
        },
      },
    });

    messageBox.message({
      name: 'foo',
      type: 'required',
    });

    expect(spy).toHaveBeenCalledWith({
      genericName: 'foo',
      name: 'foo',
      type: 'required',
    });
  });

  it('can update by calling messages', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          required: 'original',
        },
      },
    });

    messageBox.messages({
      en: {
        required: 'new',
      },
    });

    expect(messageBox.message({
      name: 'foo',
      type: 'required',
    })).toBe('new');
  });

  it('can clone', function () {
    const messageBox = new MessageBox({
      messages: {
        ab: {
          test: 'message',
        },
      },
    });
    messageBox.setLanguage('es');
    const clone = messageBox.clone();
    expect(clone.language).toBe(messageBox.language);
    expect(clone.messageList).toEqual(messageBox.messageList);
    expect(clone.evaluate).toEqual(messageBox.evaluate);
    expect(clone.escape).toEqual(messageBox.escape);
    expect(clone.interpolate).toEqual(messageBox.interpolate);

    clone.messages({
      en: {
        required: 'new',
      },
    });

    expect(clone.messageList.en).toEqual({ required: 'new' });
    expect(messageBox.messageList.en).toBe(undefined);
  });
});
