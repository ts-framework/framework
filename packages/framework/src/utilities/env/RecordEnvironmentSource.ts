import { EnvironmentSource } from '@baileyherbert/env';

export class RecordEnvironmentSource extends EnvironmentSource {

	public constructor(protected readonly record: Record<string, any>) {
		super();
	}

	public get(name: string): string | undefined {
		if (name in this.record) {
			return this.record[name];
		}

		return;
	}

	public has(name: string): boolean {
		return (name in this.record);
	}

}
