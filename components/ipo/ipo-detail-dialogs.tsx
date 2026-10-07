"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { IpoDialog } from "@/components/ipo/ipo-dialog"
import { IpoPriceDialog } from "@/components/ipo/ipo-price-dialog"
import { CheckAllotmentDialog } from "@/components/ipo/check-allotment-dialog"
import { BulkApplicationDialog } from "@/components/applications/bulk-application-dialog"
import { BulkAllotmentDialog } from "@/components/applications/bulk-allotment-dialog"
import { BulkSaleDialog } from "@/components/applications/bulk-sale-dialog"
import { RecordSaleDialog } from "@/components/applications/record-sale-dialog"
import { EditApplicationDialog } from "@/components/applications/edit-application-dialog"
import { SettlementDialog } from "@/components/applications/settlement-dialog"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"
import type { User } from "firebase/auth"

interface IpoDetailDialogsProps {
  user: User
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  deleteIpoOpen: boolean
  setDeleteIpoOpen: (open: boolean) => void
  deleting: boolean
  onDeleteIpo: () => void
  editIpoOpen: boolean
  setEditIpoOpen: (open: boolean) => void
  priceDialogOpen: boolean
  setPriceDialogOpen: (open: boolean) => void
  bulkAddOpen: boolean
  setBulkAddOpen: (open: boolean) => void
  allotmentOpen: boolean
  setAllotmentOpen: (open: boolean) => void
  bulkSaleOpen: boolean
  setBulkSaleOpen: (open: boolean) => void
  checkAllotmentOpen: boolean
  setCheckAllotmentOpen: (open: boolean) => void
  appToSell: Application | null
  setAppToSell: (app: Application | null) => void
  appToEdit: Application | null
  setAppToEdit: (app: Application | null) => void
  appToSettle: Application | null
  setAppToSettle: (app: Application | null) => void
  onReload: () => void
}

export function IpoDetailDialogs({
  user,
  ipo,
  applications,
  accounts,
  bankAccounts,
  deleteIpoOpen,
  setDeleteIpoOpen,
  deleting,
  onDeleteIpo,
  editIpoOpen,
  setEditIpoOpen,
  priceDialogOpen,
  setPriceDialogOpen,
  bulkAddOpen,
  setBulkAddOpen,
  allotmentOpen,
  setAllotmentOpen,
  bulkSaleOpen,
  setBulkSaleOpen,
  checkAllotmentOpen,
  setCheckAllotmentOpen,
  appToSell,
  setAppToSell,
  appToEdit,
  setAppToEdit,
  appToSettle,
  setAppToSettle,
  onReload,
}: IpoDetailDialogsProps) {
  return (
    <>
      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteIpoOpen} onOpenChange={setDeleteIpoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete IPO?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{ipo.name}</strong>? All linked application records will
              also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-none text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onDeleteIpo}
              disabled={deleting}
              className="rounded-none text-xs"
            >
              {deleting ? "Deleting..." : "Delete IPO"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Workflows */}
      <IpoDialog
        open={editIpoOpen}
        onOpenChange={setEditIpoOpen}
        userId={user.uid}
        ipoToEdit={ipo}
        onSuccess={() => onReload()}
      />
      <IpoPriceDialog
        open={priceDialogOpen}
        onOpenChange={setPriceDialogOpen}
        userId={user.uid}
        ipo={ipo}
        onSuccess={() => onReload()}
      />
      <BulkApplicationDialog
        open={bulkAddOpen}
        onOpenChange={setBulkAddOpen}
        userId={user.uid}
        ipo={ipo}
        existingApplications={applications}
        accounts={accounts}
        bankAccounts={bankAccounts}
        onSuccess={() => onReload()}
      />
      <BulkAllotmentDialog
        open={allotmentOpen}
        onOpenChange={setAllotmentOpen}
        userId={user.uid}
        ipo={ipo}
        applications={applications}
        accounts={accounts}
        bankAccounts={bankAccounts}
        onSuccess={() => onReload()}
      />
      <BulkSaleDialog
        open={bulkSaleOpen}
        onOpenChange={setBulkSaleOpen}
        userId={user.uid}
        ipo={ipo}
        applications={applications}
        accounts={accounts}
        onSuccess={() => onReload()}
      />
      <CheckAllotmentDialog
        open={checkAllotmentOpen}
        onOpenChange={setCheckAllotmentOpen}
        userId={user.uid}
        ipo={ipo}
        applications={applications}
        accounts={accounts}
        onSuccess={() => onReload()}
      />
      {appToSell && (
        <RecordSaleDialog
          open={true}
          onOpenChange={(open) => !open && setAppToSell(null)}
          userId={user.uid}
          ipo={ipo}
          application={appToSell}
          account={accounts.find((a) => a.id === appToSell.accountId)}
          onOpenSettlement={(app) => setAppToSettle(app)}
          onSuccess={() => {
            setAppToSell(null)
            onReload()
          }}
        />
      )}
      {appToEdit && (
        <EditApplicationDialog
          open={true}
          onOpenChange={(open) => !open && setAppToEdit(null)}
          userId={user.uid}
          ipo={ipo}
          application={appToEdit}
          account={accounts.find((a) => a.id === appToEdit.accountId)}
          bankAccounts={bankAccounts}
          onSuccess={() => {
            setAppToEdit(null)
            onReload()
          }}
        />
      )}
      {appToSettle && (
        <SettlementDialog
          open={true}
          onOpenChange={(open) => !open && setAppToSettle(null)}
          application={appToSettle}
          ipo={ipo}
          account={accounts.find((a) => a.id === appToSettle.accountId)}
          bankAccounts={bankAccounts}
          onSuccess={onReload}
        />
      )}
    </>
  )
}
