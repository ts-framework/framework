import { EnvironmentSource } from '@baileyherbert/env';

export class RecordEnvironmentSource extends EnvironmentSource {

	public constructor(protected readonly record: Record<string, any>, protected readonly prefix: string) {
		super();
	}

	public get(name: string): string | undefined {
		const originalName = name;

		if (name.startsWith(this.prefix)) {
			name = name.substring(this.prefix.length);
		}

		if (name in this.record) {
			return this.record[name];
		}

		if (originalName in this.record) {
			return this.record[originalName];
		}

		return;
	}

	public has(name: string): boolean {
		const originalName = name;

		if (name.startsWith(this.prefix)) {
			name = name.substring(this.prefix.length);
		}

		if (name in this.record) {
			return true;
		}

		if (originalName in this.record) {
			return true;
		}

		return false;
	}

	public all(): Map<string, string> {
		return new Map(Object.entries(this.record));
	}

}
