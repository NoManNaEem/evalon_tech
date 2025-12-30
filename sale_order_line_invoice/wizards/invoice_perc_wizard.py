from odoo import api, fields, models
from odoo.exceptions import UserError


class InvoicePercentageWizard(models.TransientModel):
    _name = 'invoice.percentage.wizard'
    _description = 'Invoice Percentage Wizard'

    sale_order_line_id = fields.Many2one(
        'sale.order.line',
        string="Sale Order Line",
        required=True
    )
    percentage = fields.Float(
        string="Invoice Percentage",
        required=True,
        default=0.0
    )
    remaining_percentage = fields.Float(
        string="Remaining Percentage",
        compute="_compute_remaining_percentage"
    )

    # ----------------------------------------------------
    # COMPUTE
    # ----------------------------------------------------
    @api.depends('sale_order_line_id.invoice_percentage_done')
    def _compute_remaining_percentage(self):
        for wizard in self:
            line = wizard.sale_order_line_id
            wizard.remaining_percentage = (
                100.0 - (line.invoice_percentage_done or 0.0)
                if line else 100.0
            )

    # ----------------------------------------------------
    # ONCHANGE
    # ----------------------------------------------------
    @api.onchange('sale_order_line_id')
    def _onchange_sale_order_line_id(self):
        """Autofill percentage with remaining."""
        line = self.sale_order_line_id
        if line:
            remaining = 100.0 - (line.invoice_percentage_done or 0.0)
            self.percentage = max(remaining, 0.0)

    # ----------------------------------------------------
    # ACTION
    # ----------------------------------------------------
    def action_create_invoice(self):
        self.ensure_one()

        line = self.sale_order_line_id
        order = line.order_id

        if not order:
            raise UserError("This sale order line is not linked to any Sale Order.")

        if order.state not in ('sale', 'done'):
            raise UserError("The Sale Order must be confirmed before creating an invoice.")

        if self.percentage <= 0:
            raise UserError("Cannot create invoice with a percentage of 0 or less.")

        done = line.invoice_percentage_done or 0.0
        remaining = 100.0 - done
        new_total = done + self.percentage

        if new_total > 100:
            raise UserError(
                f"You cannot invoice more than 100%.\n"
                f"Already invoiced: {done}%.\n"
                f"Remaining: {remaining}%."
            )

        invoice_line_vals = {
            'name': f"{line.name} ({self.percentage}%)",
            'product_id': line.product_id.id,
            'quantity': line.product_uom_qty * (self.percentage / 100.0),
            'price_unit': line.price_unit,
            'sale_line_ids': [(6, 0, [line.id])],
        }

        invoice_vals = {
            'move_type': 'out_invoice',
            'partner_id': order.partner_id.id,
            'invoice_origin': order.name,
            'invoice_line_ids': [(0, 0, invoice_line_vals)],
        }

        invoice = self.env['account.move'].create(invoice_vals)

        line.invoice_percentage_done = new_total

        return {
            'type': 'ir.actions.act_window',
            'name': 'Invoice',
            'res_model': 'account.move',
            'res_id': invoice.id,
            'view_mode': 'form',
            'target': 'current',
        }
