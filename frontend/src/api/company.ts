import axios from './axios';

export interface CompanySettings {
    id: number;
    brand_name: string;
    ho_address: string;
    ho_email: string;
    ho_phone: string;
    logo_path: string;
    company_cin: string;
    company_tan: string;
    item_code_format: string;
    enable_markdown_calc: boolean;
    enable_channel_pricing: boolean;
    markdown_admin_only: boolean;
    minimum_global_margin: number;
    default_markdown_margin: number;
    enable_estimate_stock_check: boolean;
    block_estimate_if_no_stock: boolean;
    enable_bill_modify: boolean;
    enable_excel_import: boolean;
    enable_gst: boolean;
    default_cash_sale_mode: boolean;
    low_stock_threshold: number;
    show_product_img: boolean;
    hsn_code_length: number;
}

export const getCompanySettings = async () => {
    const response = await axios.get('/company/settings');
    return response.data;
};

export const updateCompanySettings = async (data: Partial<CompanySettings>) => {
    const response = await axios.post('/company/settings', data);
    return response.data;
};
