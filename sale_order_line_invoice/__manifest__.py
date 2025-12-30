# -*- coding: utf-8 -*-
{
    'name': "Partial Invoicing by Percentage for Sale Order Lines (Progressive Billing)",
    'summary': "Create partial invoices by percentage per sale order line — milestone & progressive billing for Odoo 18",
    'description': """Partial Invoicing by Percentage for Sale Order Lines (Progressive Billing)
=========================================================================

Create invoices based on a percentage of a sale order line instead of the full amount.
Ideal for milestone billing, partial delivery, progressive payments, and service projects.
""",
    'author': "EvalonTech",
    'website': "https://www.linkedin.com/company/evalontech/",
    'category': 'Sales',
    'version': '18.0.1.0',
    'license': 'OPL-1',
    'currency': 'USD',
    'price': 20.00,

    'depends': ["base", "sale_management", "account"],
    'data': [
        "security/ir.model.access.csv",
        "wizards/invoice_perc_wizard.xml",
        "views/invoice_from_sale_order_line.xml",
    ],
    'images': [
        'static/description/banner.png',
        'static/description/icon.png',
    ],

    'installable': True,
    'application': False,
}
