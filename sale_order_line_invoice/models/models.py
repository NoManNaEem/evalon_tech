from odoo import models, fields, api


class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'
    _description = 'Sale Order Line'

    invoice_percentage_done = fields.Float(
        string="Invoiced Percentage",
        default=0.0,
    )

    no_remaining_percentage = fields.Boolean(
        compute="_compute_remaining_flags",
        store=True
    )
    no_remaining_amount = fields.Boolean(
        compute="_compute_remaining_flags",
        store=True
    )

    def copy_data(self, default=None):
        default = dict(default or {})
        default['invoice_percentage_done'] = 0.0
        return super().copy_data(default)

    @api.depends('invoice_percentage_done', 'order_id.remaining_invoicable_amount')
    def _compute_remaining_flags(self):
        for line in self:
            # True if line invoiced 100%
            percentage_done = (100.0 - (line.invoice_percentage_done or 0.0)) <= 0.0

            # True if whole order has no amount left
            amount_done = (line.order_id.remaining_invoicable_amount or 0.0) <= 0.0

            line.no_remaining_percentage = percentage_done
            line.no_remaining_amount = amount_done

    def action_open_invoice_percentage_wizard(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'invoice.percentage.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_sale_order_line_id': self.id,
            },
        }


class SalerOrder(models.Model):
    _inherit = 'sale.order'

    remaining_invoicable_amount = fields.Monetary(
        string="Remaining Invoicable Amount",
        compute="_compute_remaining_invoicable_amount",
        store=True,
        currency_field='currency_id'
    )


    @api.depends('invoice_ids', 'invoice_ids.amount_total', 'invoice_ids.state', 'amount_total')
    def _compute_remaining_invoicable_amount(self):
        for order in self:
            invoiced_total = sum(order.invoice_ids.filtered(lambda inv: inv.state != 'cancel').mapped('amount_total'))
            remaining =  round(order.amount_total - invoiced_total, 2)

            if remaining < 0 and abs(remaining) < 0.02:
                remaining = 0.0

            order.remaining_invoicable_amount = remaining


