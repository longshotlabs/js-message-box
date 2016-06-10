import MessageBox from './MessageBox';
import expect, { createSpy } from 'expect';

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
    })).toEqual('It is required');
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
    })).toEqual('Es requerido');
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
    }, { language: 'es-ES' })).toEqual('Es requerido');
  });

  it('handlebars in messages works', function () {
    const messageBox = new MessageBox({
      messages: {
        en: {
          required: '{{name}} is required',
        },
      },
    });

    expect(messageBox.message({
      name: 'foo',
      type: 'required',
    })).toEqual('foo is required');
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
    })).toEqual('This one');
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
    })).toEqual('FOO');

    expect(messageBox.message({
      name: 'foo2',
      type: 'required',
    })).toEqual('DEFAULT');
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
    })).toEqual('FOO');

    expect(messageBox.message({
      name: 'foo2.$.bar',
      type: 'required',
    })).toEqual('DEFAULT');
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
    })).toEqual('It is required');

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
    })).toEqual('Es requerido');

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
});
