import {
  signal,
  type WidgetContext,
  type WidgetPayload,
  type WritableSignal,
} from '@displayduck/base';

type ExampleConfig = {
  exampleBoolean?: boolean;
  exampleColorPicker?: string;
  exampleNumber?: number;
  exampleDropdown?: string;
  exampleWidgetPicker?: unknown;
  allowEventAccess?: boolean;
  allowFocusGrab?: boolean;
};

const readConfig = (payload: WidgetPayload): ExampleConfig => {
  const config = payload.config;
  return config && typeof config === 'object' ? config as ExampleConfig : {};
};

export class DisplayDuckWidget {
  public readonly payload: WritableSignal<WidgetPayload>;
  public readonly config: WritableSignal<ExampleConfig>;
  public readonly liveSignal: WritableSignal<boolean>;

  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(private readonly ctx: WidgetContext) {
    this.payload = signal(ctx.payload ?? {});
    this.config = signal(readConfig(ctx.payload ?? {}));
    this.liveSignal = signal(false);
  }

  public onInit(): void {
    this.timer = setInterval(() => {
      this.liveSignal.update((value) => !value);
    }, 2000);

    console.info('[DisplayDuck Example] signal demo initialized', {
      payload: this.payload(),
      config: this.config(),
    });
  }

  public onUpdate(payload: WidgetPayload): void {
    this.payload.set(payload ?? {});
    this.config.set(readConfig(payload ?? {}));
  }

  public onDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
