from odoo import fields, models

class ResConfiguration(models.TransientModel):
    _inherit = 'res.config.settings'

    fixed_discount_pos = fields.Boolean(config_parameter="point_of_sale_fixed_discount.fixed_discount_pos") #Module name + key, ir_config_parameter table(system wide key value store) stores the toggle value.