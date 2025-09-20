

export class DnsRecord {
    type: string;
    name: string;
    value: string;
    class: string = 'IN'; // DNS class (Internet)

    constructor(name: string, type: string, value: string, dnsClass: string = 'IN') {
        this.name = name;
        this.type = type;
        this.value = value;
        this.class = dnsClass;
    }

    toString(): string {
        // Format: name. IN TYPE value
        const formattedName = this.name.endsWith('.') ? this.name : `${this.name}.`;
        if (this.type === 'TXT') {
            // TXT records should be quoted
            const quotedValue = this.value.startsWith('"') && this.value.endsWith('"')
                ? this.value
                : `"${this.value}"`;
            return `${formattedName} ${this.class} ${this.type} ${quotedValue}`;
        }
        return `${formattedName} ${this.class} ${this.type} ${this.value}`;
    }
}

export function parseDnsRecord(record: string): DnsRecord {
    // Support both formats:
    // 1. Standard: "name. IN TYPE value" 
    // 2. Simple: "TYPE name value" (legacy)

    const trimmed = record.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length < 3) {
        throw new Error(`Invalid DNS record: ${record}`);
    }

    let name: string, type: string, value: string, dnsClass: string = 'IN';

    // Check if it's standard format (name. IN TYPE value)
    if (parts.length >= 4 && parts[1] === 'IN') {
        name = parts[0] ?? '';
        dnsClass = parts[1];
        type = parts[2] ?? '';
        value = parts.slice(3).join(' ');
    } else {
        // Legacy format (TYPE name value)
        type = parts[0] ?? '';
        name = parts[1] ?? '';
        value = parts.slice(2).join(' ');
    }

    // Validate type
    if (!['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'SRV', 'NS', 'PTR'].includes(type)) {
        throw new Error(`Invalid DNS record type: ${type}`);
    }

    // Validate name
    if (!name || name.length === 0) {
        throw new Error(`Invalid DNS record name: ${name}`);
    }

    // Validate value
    if (!value || value.length === 0) {
        throw new Error(`Invalid DNS record value: ${value}`);
    }

    // Remove quotes from TXT record values for internal storage
    if (type === 'TXT' && value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
    }

    return new DnsRecord(name, type, value, dnsClass);
}