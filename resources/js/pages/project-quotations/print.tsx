import { Head, Link } from '@inertiajs/react';
import { edit, index } from '@/actions/App/Http/Controllers/ProjectQuotationController';
import type { ProjectQuotationPrintItem, ProjectQuotationPrintProps } from '@/types';

const companyName = 'PT AXELERA TEKNO SOLUSI';
const minimumItemRows = 12;

export default function ProjectQuotationPrint({ quotation }: ProjectQuotationPrintProps) {
    const rows = printableRows(quotation.items);
    const customerAddress = quotation.customer_address || quotation.customer_identifier || '';
    const description = quotation.description || quotation.quotation_type_label;
    const signatureName = quotation.approved_by_name || quotation.prepared_by_name || '';

    return (
        <>
            <Head title={quotation.quotation_no} />
            <style>{printStyles}</style>

            <div className="quotation-print-page">
                <div className="print-toolbar">
                    <div className="toolbar-links">
                        <Link href={index.url()}>Back</Link>
                        <Link href={edit.url(quotation.id)}>Edit</Link>
                    </div>
                    <button type="button" onClick={() => window.print()}>
                        Print
                    </button>
                </div>

                <div className="sheet">
                    <div className="top-grid">
                        <div>
                            <h2 className="brand-title">AXEL</h2>
                            <div className="company-info">
                                <div>JL. Andara,</div>
                                <div>Kelurahan Pangkalan Jati Baru,</div>
                                <div>Kec. Cinere, Kota Depok, Jawa Barat, 16542</div>
                                <div>Telp : 021-0000-0000</div>
                                <div>Website: www.axeltekno.com</div>
                            </div>

                            <div className="customer-box">
                                <div className="head">Customer</div>
                                <div className="body">
                                    <div>
                                        <strong>{quotation.customer_name || '-'}</strong>
                                    </div>
                                    <div className="pre-line">{customerAddress || '-'}</div>
                                    <div className="pre-line">cc : {quotation.cc || '-'}</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="quotation-head">
                                <h1>QUOTATION</h1>
                                <div className="company">{companyName}</div>
                            </div>
                            <table className="meta-table">
                                <tbody>
                                    <tr>
                                        <td>Tanggal</td>
                                        <td>{formatDate(quotation.quotation_date)}</td>
                                    </tr>
                                    <tr>
                                        <td>Nomor Quotation</td>
                                        <td>{quotation.quotation_no}</td>
                                    </tr>
                                    <tr>
                                        <td>Alamat Customer</td>
                                        <td className="pre-line">{customerAddress || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td>Keterangan</td>
                                        <td className="meta-value">{description}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <table className="items-table">
                        <colgroup>
                            <col style={{ width: '4%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '9%' }} />
                            <col style={{ width: '36.5%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '11.5%' }} />
                            <col style={{ width: '6%' }} />
                            <col style={{ width: '15%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Kategori</th>
                                <th>Satuan Unit</th>
                                <th>Deskripsi</th>
                                <th>QTY</th>
                                <th>Harga per Unit</th>
                                <th>Disc</th>
                                <th>JUMLAH (Rp)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((item, indexKey) =>
                                item ? (
                                    <tr key={item.id}>
                                        <td className="center">{indexKey + 1}</td>
                                        <td>{titleCase(item.category)}</td>
                                        <td>{titleCase(item.unit)}</td>
                                        <td className="pre-line">{item.description}</td>
                                        <td className="right">{formatQuantity(item.qty)}</td>
                                        <td className="right">{formatCurrency(item.unit_price)}</td>
                                        <td className="right">
                                            {formatPercent(item.discount_percent)}
                                        </td>
                                        <td className="right">{formatCurrency(item.amount)}</td>
                                    </tr>
                                ) : (
                                    <tr key={`empty-${indexKey}`} className="item-empty-row">
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td className="dash">-</td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>

                    <div className="summary-grid">
                        <div className="payment-wrap">
                            <div className="payment-head">
                                <div>Term of Payment</div>
                                <div>Quotation Valid until :</div>
                            </div>
                            <div className="payment-body">
                                <div>{formatDate(quotation.term_of_payment_date)}</div>
                                <div>{formatDate(quotation.valid_until_date)}</div>
                            </div>
                        </div>
                        <div className="total-wrap">
                            <table className="total-table">
                                <tbody>
                                    <tr>
                                        <td>Sub Total</td>
                                        <td>{formatCurrency(quotation.subtotal)}</td>
                                    </tr>
                                    <tr>
                                        <td>Ppn / pph</td>
                                        <td>{formatTax(quotation.ppn_pph_percent)}</td>
                                    </tr>
                                    <tr>
                                        <td>TOTAL</td>
                                        <td>Rp{formatCurrency(quotation.grand_total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="note-line">Note : {quotation.note || '-'}</div>
                    <div className="creator-bar">Pembuat :</div>

                    <div className="footer-grid">
                        <div className="signature">
                            <div className="signature-line"></div>
                            <div className="signature-name">
                                {signatureName !== '' ? signatureName : '............................'}
                            </div>
                            <div className="signature-company">{companyName}</div>
                        </div>
                        <div className="qr-block">
                            {quotation.qr_code_url && <img src={quotation.qr_code_url} alt="QR" />}
                            <div className="url">{quotation.qr_target_url}</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function printableRows(items: ProjectQuotationPrintItem[]): Array<ProjectQuotationPrintItem | null> {
    return [
        ...items,
        ...Array.from({ length: Math.max(minimumItemRows - items.length, 0) }, () => null),
    ];
}

function formatDate(value: string | null) {
    if (!value) {
        return '-';
    }

    const [year, month, day] = value.split('-');
    const monthName = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ][Number(month) - 1];

    if (!year || !monthName || !day) {
        return value;
    }

    return `${day}-${monthName}-${year}`;
}

function formatCurrency(value: string | number | null) {
    if (value === null || value === '') {
        return '-';
    }

    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
    }).format(Number(value));
}

function formatQuantity(value: string | number | null) {
    if (value === null || value === '') {
        return '-';
    }

    const formatted = Number(value).toFixed(2);

    return formatted.replace(/\.?0+$/, '');
}

function formatPercent(value: string | number | null) {
    if (value === null || value === '') {
        return '-';
    }

    const formatted = Number(value).toFixed(2).replace(/\.?0+$/, '');

    return `${formatted}%`;
}

function formatTax(value: string | number | null) {
    if (value === null || value === '') {
        return '0.00%';
    }

    return `${Number(value).toFixed(2)}%`;
}

function titleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

const printStyles = `
:root {
    --quotation-blue: #4e78c6;
    --quotation-line: #232323;
    --quotation-light-bg: #efefef;
    --quotation-muted-bg: #8f8f8f;
    --quotation-grand-bg: #d9e3f4;
}

.quotation-print-page,
.quotation-print-page * {
    box-sizing: border-box;
}

.quotation-print-page {
    margin: 0;
    min-height: 100vh;
    font-family: Arial, sans-serif;
    color: #111;
    background: #e3e6ea;
    font-size: 11px;
    line-height: 1.35;
}

.print-toolbar {
    width: 210mm;
    margin: 10px auto 6px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
}

.toolbar-links {
    display: flex;
    gap: 6px;
}

.print-toolbar a,
.print-toolbar button {
    border: 1px solid #9ca3af;
    background: #fff;
    padding: 6px 12px;
    font-size: 12px;
    color: #111;
    text-decoration: none;
    cursor: pointer;
}

.sheet {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto 16px;
    padding: 8mm 7mm 10mm;
    background: var(--quotation-light-bg);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.top-grid {
    display: grid;
    grid-template-columns: 1.18fr 0.82fr;
    gap: 6mm;
    align-items: start;
}

.brand-title {
    margin: 0;
    font-size: 28px;
    letter-spacing: 1px;
    line-height: 1;
    font-weight: 700;
}

.company-info {
    margin-top: 8px;
    font-size: 9px;
    line-height: 1.45;
}

.customer-box {
    margin-top: 10px;
}

.customer-box .head {
    background: var(--quotation-blue);
    color: #fff;
    font-size: 10px;
    padding: 4px 7px;
}

.customer-box .body {
    min-height: 52px;
    padding: 6px 7px;
    font-size: 9px;
}

.quotation-head {
    text-align: right;
    max-width: 100%;
    overflow-wrap: anywhere;
}

.quotation-head h1 {
    margin: 0;
    font-size: 21px;
    letter-spacing: 1px;
    color: #243b66;
    font-weight: 500;
    line-height: 1.1;
}

.quotation-head .company {
    margin-top: 2px;
    font-size: 8.6px;
    letter-spacing: 0.2px;
    color: #243b66;
    font-weight: 600;
    line-height: 1.2;
    white-space: normal;
    word-break: break-word;
}

.meta-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
    font-size: 9px;
}

.meta-table td {
    padding: 1px 0;
    vertical-align: top;
}

.meta-table td:first-child {
    width: 100px;
    font-weight: 700;
}

.meta-table .meta-value,
.pre-line {
    white-space: pre-line;
}

.items-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-top: 12px;
    font-size: 9px;
}

.items-table th {
    border: 1px solid #2f5698;
    background: var(--quotation-blue);
    color: #fff;
    text-align: center;
    font-size: 10px;
    font-weight: 500;
    padding: 4px 3px;
}

.items-table td {
    border: 1px solid var(--quotation-line);
    padding: 3px 4px;
    vertical-align: top;
    word-break: break-word;
}

.items-table td.center {
    text-align: center;
}

.items-table td.right {
    text-align: right;
}

.item-empty-row td {
    height: 17px;
}

.item-empty-row .dash {
    color: #111;
    text-align: right;
}

.summary-grid {
    display: grid;
    grid-template-columns: 56% 44%;
    margin-top: -1px;
}

.payment-wrap {
    border: 1px solid var(--quotation-line);
    border-right: none;
}

.payment-head {
    display: grid;
    grid-template-columns: 1fr 1fr;
}

.payment-head div {
    background: var(--quotation-blue);
    border-right: 1px solid var(--quotation-line);
    color: #fff;
    padding: 4px 6px;
    font-size: 10px;
    font-weight: 600;
}

.payment-head div:last-child {
    border-right: none;
}

.payment-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 44px;
}

.payment-body div {
    border-top: 1px solid var(--quotation-line);
    border-right: 1px solid var(--quotation-line);
    padding: 8px 6px;
    font-size: 10px;
}

.payment-body div:last-child {
    border-right: none;
}

.total-wrap {
    border: 1px solid var(--quotation-line);
}

.total-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10px;
}

.total-table td {
    border-bottom: 1px solid var(--quotation-line);
    padding: 3px 6px;
}

.total-table td:first-child {
    width: 56%;
}

.total-table td:last-child {
    border-left: 1px solid var(--quotation-line);
    text-align: right;
}

.total-table tr:last-child td {
    font-weight: 700;
    border-bottom: 2px solid var(--quotation-line);
    font-size: 12px;
}

.total-table tr:last-child td:last-child {
    background: var(--quotation-grand-bg);
}

.note-line {
    margin-top: 6px;
    width: 56%;
    border: 1px solid #b8b8b8;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 700;
}

.creator-bar {
    margin-top: 8px;
    background: var(--quotation-muted-bg);
    color: #fff;
    font-size: 10px;
    padding: 3px 8px;
    border: 1px solid #7f7f7f;
}

.footer-grid {
    margin-top: 8px;
    display: grid;
    grid-template-columns: 65% 35%;
    min-height: 92px;
}

.signature {
    padding-top: 56px;
}

.signature-line {
    width: 74mm;
    border-top: 1px solid #111;
}

.signature-name {
    width: 74mm;
    text-align: center;
    margin-top: 4px;
    font-size: 10px;
}

.signature-company {
    width: 74mm;
    text-align: center;
    font-size: 9px;
}

.qr-block {
    text-align: center;
    align-self: end;
}

.qr-block img {
    width: 30mm;
    height: 30mm;
    object-fit: contain;
}

.qr-block .url {
    font-size: 9px;
    margin-top: 2px;
}

@page {
    size: A4 portrait;
    margin: 0;
}

@media print {
    body {
        background: #fff;
    }

    .print-toolbar {
        display: none;
    }

    .sheet {
        margin: 0;
        box-shadow: none;
        width: 210mm;
        min-height: 297mm;
    }
}
`;
