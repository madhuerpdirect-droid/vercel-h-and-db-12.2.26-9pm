import React, { useState, useEffect } from 'react';
import { PaymentMode } from '../types';
import { getInstallmentStatus } from '../services/logicService';
import { sendPaymentLink, sendReceipt } from '../services/whatsappService';
import db from '../db';

const Collections: React.FC = () => {

  // 🔥 Real reactive state
  const [chits, setChits] = useState(db.getChits());
  const [members, setMembers] = useState(db.getMembers());
  const [memberships, setMemberships] = useState(db.getMemberships());

  const [selectedChit, setSelectedChit] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [showCollectDialog, setShowCollectDialog] = useState<any>(null);

  // 🔥 Reload data from DB
  const loadData = () => {
    setChits([...db.getChits()]);
    setMembers([...db.getMembers()]);
    setMemberships([...db.getMemberships()]);
  };

  // 🔥 Listen for DB updates (sync or changes)
  useEffect(() => {
    loadData();

    db.setDirtyListener(() => {
      loadData();
    });

  }, []);

  // 🔥 Set first chit automatically after load
  useEffect(() => {
    if (chits.length > 0 && !selectedChit) {
      setSelectedChit(chits[0].chitGroupId);
    }
  }, [chits]);

  const currentChit = chits.find(c => c.chitGroupId === selectedChit);

  const filteredMemberships = memberships.filter(
    m => m.chitGroupId === selectedChit
  );

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

  return (
    <div className="space-y-6 animate-in">

      {/* Filters */}
      <div className="ms-bg-card p-4 rounded border ms-border ms-shadow flex flex-col md:flex-row items-stretch md:items-end gap-4 mx-0">

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

      {/* Example Debug Output (Remove After Testing) */}
      {filteredMemberships.length === 0 && (
        <div className="text-center text-gray-500 text-sm">
          No memberships found for this group.
        </div>
      )}

      {/* 🔥 Your existing table UI should use filteredMemberships instead of memberships */}

    </div>
  );
};

export default Collections;
