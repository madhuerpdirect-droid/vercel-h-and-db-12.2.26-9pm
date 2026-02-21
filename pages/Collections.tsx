import React, { useState, useEffect } from 'react';
import { PaymentMode } from '../types';
import { getInstallmentStatus } from '../services/logicService';
import { sendPaymentLink, sendReceipt } from '../services/whatsappService';
import db from '../db';

const Collections: React.FC = () => {

  /* ================= STATE ================= */

  const [chits, setChits] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);

  const [selectedChit, setSelectedChit] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [showCollectDialog, setShowCollectDialog] = useState<any>(null);

  /* ================= LOAD DATA ================= */

  const loadData = () => {
    setChits([...db.getChits()]);
    setMembers([...db.getMembers()]);
    setMemberships([...db.getMemberships()]);
  };

  /* ================= DB LISTENERS ================= */

  useEffect(() => {

    loadData();

    // 🔥 Refresh on local changes
    db.setDirtyListener(() => {
      loadData();
    });

    // 🔥 Refresh after sync completes
    db.setSyncListener((syncing) => {
      if (!syncing) {
        loadData();
      }
    });

  }, []);

  /* ================= ENSURE VALID SELECTED CHIT ================= */

  useEffect(() => {
    if (chits.length > 0) {

      const exists = chits.some(c => c.chitGroupId === selectedChit);

      if (!selectedChit || !exists) {
        setSelectedChit(chits[0].chitGroupId);
      }
    }
  }, [chits, selectedChit]);

  /* ================= DERIVED ================= */

  const currentChit = chits.find(c => c.chitGroupId === selectedChit);

  const filteredMemberships = memberships.filter(
    m => m.chitGroupId === selectedChit
  );

  /* ================= COLLECT HANDLER ================= */

  const handleCollect = (formData: any) => {
    const { memberId, amount, mode, ref } = formData;

    db.addPayment({
      paymentId: `pay_${Date.now()}`,
      chitGroupId: selectedChit,
      memberId,
      monthNo: selectedMonth,
      paidAmount: Number(amount),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: mode as PaymentMode,
      referenceNo: ref,
      collectedBy: 'admin'
    });

    const member = members.find(m => m.memberId === memberId);

    if (member && currentChit) {
      sendReceipt(
        selectedChit,
        memberId,
        member.mobile,
        member.name,
        currentChit.name,
        selectedMonth,
        Number(amount)
      );
    }

    setShowCollectDialog(null);
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6 animate-in">

      {/* Filters */}
      <div className="ms-bg-card p-4 rounded border ms-border ms-shadow flex flex-col md:flex-row items-stretch md:items-end gap-4 mx-0">

        {/* Group Select */}
        <div className="flex flex-col flex-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">
            Select Group
          </label>
          <select
            value={selectedChit}
            onChange={(e) => setSelectedChit(e.target.value)}
            className="border ms-border p-2 rounded text-sm outline-none w-full bg-white"
          >
            {chits.map(c => (
              <option key={c.chitGroupId} value={c.chitGroupId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Month Select */}
        <div className="flex flex-col w-full md:w-32">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">
            Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border ms-border p-2 rounded text-sm outline-none w-full bg-white"
          >
            {Array.from(
              { length: currentChit?.totalMonths || 0 },
              (_, i) => i + 1
            ).map(m => (
              <option key={m} value={m}>
                M{m}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Debug fallback */}
      {filteredMemberships.length === 0 && (
        <div className="text-center text-gray-500 text-sm">
          No memberships found for this group.
        </div>
      )}

      {/* 🔥 IMPORTANT:
         Your table should use filteredMemberships
         NOT memberships
      */}

    </div>
  );
};

export default Collections;
