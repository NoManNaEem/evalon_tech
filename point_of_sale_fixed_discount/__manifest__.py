# -*- coding: utf-8 -*-
{
    'name': "POS Fixed Amount Discount",
    'summary': "Add fixed amount discount option in POS instead of percentage (Odoo 18 Community)",
    'description': """POS Fixed Discount for Odoo 18
------------------------------
This module allows POS users to apply discounts as a **fixed amount**
instead of percentage. A toggle option is added in Point of Sale
settings to enable or disable fixed discount mode.

• Fixed amount discount per order line
• Auto recalculates when quantity changes
• Receipt shows correct discount value
• Toggle from POS settings
• 100% compatible with Odoo 18 Community
""",
    'author': "EvalonTech",
    'website': "https://www.linkedin.com/company/evalontech/",
    'category': 'Point of Sale',
    'version': '18.0.1.0',
    'license': 'Commercial',
    'currency': 'USD',
    'price': 20.00,


    'depends': ['base', 'point_of_sale'],
    'data': [
        'views/res_config_settings_view.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'point_of_sale_fixed_discount/static/src/**/*',
        ],
    },

    "installable": True,
    "application": False,
}

