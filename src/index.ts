import XMLHttpRequestPolyfilleEvents from './events';

export default class XMLHttpRequestPolyfill extends XMLHttpRequestPolyfilleEvents implements XMLHttpRequest {
  private aborted: boolean = false;
  private request?: Request;
  private responseHeaders?: Headers;
  private stream?: ReadableStreamDefaultReader | null;
  private textDecoder: TextDecoder;

  constructor() {
    super();

    this.textDecoder = new TextDecoder();
  }

  public abort() {
    this.aborted = true;
  }
  public getAllResponseHeaders(): string {
    let result = '';
    if (this.responseHeaders) {
      this.responseHeaders.forEach((value, name) => {
        result += `${ name }: ${ value }`;
      });
    }
    return result;
  }
  public getResponseHeader(header: string): string | null {
    if (this.responseHeaders && this.responseHeaders.has(header)) {
      return this.responseHeaders.get(header);
    }
    return null;
  }
  public msCachingEnabled(): boolean {
    throw Error('not implemented');
  }
  public open(method: string, url: string, async?: boolean, user?: string, password?: string) {
    this.request = new Request(url, {
      method,

    });
    this.readyState = this.OPENED;
    this.onreadystatechange(new Event('readystatechange'));
  }
  public overrideMimeType(mime: string): void {
    throw Error('not implemented');
  }
  public setRequestHeader(header: string, value: string): void {
    if (!this.request) {
      throw Error();
    }

    this.request.headers.append(header, value);
  }
  public send(data?: any): void {
    if (!this.request) {
      throw Error();
    }

    if (data) {
      this.request = new Request(this.request, {
        body: data,
      });
    }

    fetch(this.request)
      .then(response => {
        if (this.aborted) {
          return '';
        }

        this.readyState = this.HEADERS_RECEIVED;
        this.onreadystatechange(new Event('readystatechange'));

        this.status = response.status;
        this.statusText = response.statusText;
        this.responseHeaders = response.headers;

        this.readyState = this.LOADING;
        this.onreadystatechange(new Event('readystatechange'));

        if (!response.body) {
          return this.handleError();
        }

        this.stream = response.body.getReader();

        this.responseText = '';

        if (!this.stream) {
          return this.handleError();
        }

        this.readStream();
      });
  }
  public readStream()  {
    if (!this.stream) {
      return;
    }

    this.stream.read().then((result) => {
      if (result.value) {
        const text = this.textDecoder.decode(
          result.value || new Uint8Array(0), { stream: !result.done }
        );
        this.responseText += text;
        this.onprogress(new Event('progress'));
      }

      if (result.done) {
        this.handleFinish();
      } else {
        this.onreadystatechange(new Event('readystatechange'));
        this.readStream();
      }
    }).catch(() => {
      this.handleError();
    });
  }
  public handleFinish() {
    this.readyState = this.DONE;
    this.stream = null;

    this.onload(new Event('load'));
    this.onloadend(new Event('loadend'));
    this.onreadystatechange(new Event('readystatechange'));
  }
  public handleError() {
    this.readyState = this.DONE;
    this.stream = null;

    this.onload(new Event('error'));
    this.onloadend(new Event('loadend'));
    this.onreadystatechange(new Event('readystatechange'));
  }
}
