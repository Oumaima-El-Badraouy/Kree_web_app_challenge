
const Score = require('../models/Score');
const User = require('../models/User');

// Ajouter 5 points après livraison
exports.addPointsForDelivery = async (customerId, agencyId, io) => {
  try {
    // Ajouter ou créer le score
    const score = await Score.findOneAndUpdate(
      { customer: customerId },
      { $inc: { points: 5 } },
      { new: true, upsert: true }
    );

    // Créer une notification pour le client
    const notif = await Notification.create({
      recipient: customerId,
      sender: agencyId,
      type: 'Delivered',
      message: `Votre commande a été livrée avec succès ! 🎉 Vous avez gagné +5 points.`,
      link: '/customer/score',
    });

    return score;
  } catch (error) {
    console.error('Error adding delivery points:', error);
    throw error;
  }
};

