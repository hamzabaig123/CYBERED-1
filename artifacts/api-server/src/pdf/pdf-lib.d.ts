declare module "*.pdf-lib.esm.js" {
    export class PDFDocument {
        static load(data: Uint8Array | ArrayBuffer | Buffer, opts?: { ignoreEncryption?: boolean; capNumbers?: boolean; throwOnInvalidObject?: boolean }): Promise<PDFDocument>;
        static create(opts?: { throwOnInvalidObject?: boolean }): Promise<PDFDocument>;
        getPageCount(): number;
        getPageIndices(): number[];
        copyPages(src: PDFDocument, indices: number[]): Promise<any[]>;
        addPage(page: any): any;
        addPages(pages: any[]): void;
        insertPage(index: number, page: any): any;
        save(opts?: { useObjectStreams?: boolean; addDefaultPage?: boolean; objectsPerTick?: number; updateFieldAppearances?: boolean }): Promise<Uint8Array>;
    }

    export function degrees(n: number): any;
    export function rgb(r: number, g: number, b: number): any;
    export const PDFName: any;
    export const PDFString: any;
    export const StandardFonts: {
        Courier: string;
        CourierBold: string;
        CourierOblique: string;
        CourierBoldOblique: string;
        Helvetica: string;
        HelveticaBold: string;
        HelveticaOblique: string;
        HelveticaBoldOblique: string;
        TimesRoman: string;
        TimesRomanBold: string;
        TimesRomanItalic: string;
        TimesRomanBoldItalic: string;
    };
}
