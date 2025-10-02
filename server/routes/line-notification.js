const express = require('express');
const axios = require('axios');
const router = express.Router();

// LINE Messaging API Configuration
const LINE_CONFIG = {
  CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  API_BASE_URL: 'https://api.line.me/v2'
};

// Send LINE notification to specific user
router.post('/send-to-user', async (req, res) => {
  try {
    const { lineId, message, reportData } = req.body;

    if (!lineId || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'LINE ID and message are required' 
      });
    }

    if (!LINE_CONFIG.CHANNEL_ACCESS_TOKEN) {
      return res.status(500).json({ 
        success: false, 
        error: 'LINE Channel Access Token not configured' 
      });
    }

    // Prepare LINE message
    const lineMessage = {
      to: lineId,
      messages: [
        {
          type: 'text',
          text: message
        }
      ]
    };

    // If report data is provided, add it as additional message
    if (reportData) {
      lineMessage.messages.push({
        type: 'text',
        text: `📊 Export Report\n\n${reportData}`
      });
    }

    // Send message via LINE Messaging API
    const response = await axios.post(
      `${LINE_CONFIG.API_BASE_URL}/bot/message/push`,
      lineMessage,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    console.log('✅ LINE notification sent successfully:', response.data);

    res.json({
      success: true,
      message: 'LINE notification sent successfully',
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error sending LINE notification:', error);
    
    if (error.response) {
      console.error('LINE API Error:', error.response.data);
      return res.status(500).json({
        success: false,
        error: 'Failed to send LINE notification',
        details: error.response.data
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Send LINE notification to multiple users
router.post('/send-to-multiple', async (req, res) => {
  try {
    const { lineIds, message, reportData } = req.body;

    if (!lineIds || !Array.isArray(lineIds) || lineIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'LINE IDs array is required' 
      });
    }

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    if (!LINE_CONFIG.CHANNEL_ACCESS_TOKEN) {
      return res.status(500).json({ 
        success: false, 
        error: 'LINE Channel Access Token not configured' 
      });
    }

    const results = [];
    const errors = [];

    // Send message to each LINE ID
    for (const lineId of lineIds) {
      try {
        const lineMessage = {
          to: lineId,
          messages: [
            {
              type: 'text',
              text: message
            }
          ]
        };

        // If report data is provided, add it as additional message
        if (reportData) {
          lineMessage.messages.push({
            type: 'text',
            text: `📊 Export Report\n\n${reportData}`
          });
        }

        const response = await axios.post(
          `${LINE_CONFIG.API_BASE_URL}/bot/message/push`,
          lineMessage,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
            }
          }
        );

        results.push({
          lineId,
          success: true,
          data: response.data
        });

        console.log(`✅ LINE notification sent to ${lineId}:`, response.data);

      } catch (error) {
        console.error(`❌ Error sending LINE notification to ${lineId}:`, error);
        errors.push({
          lineId,
          error: error.response?.data || error.message
        });
      }
    }

    res.json({
      success: errors.length === 0,
      message: `Sent to ${results.length} users, ${errors.length} failed`,
      results,
      errors
    });

  } catch (error) {
    console.error('❌ Error in send-to-multiple:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Send LINE notification to group
router.post('/send-to-group', async (req, res) => {
  try {
    const { groupId, message, reportData } = req.body;

    if (!groupId || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Group ID and message are required' 
      });
    }

    if (!LINE_CONFIG.CHANNEL_ACCESS_TOKEN) {
      return res.status(500).json({ 
        success: false, 
        error: 'LINE Channel Access Token not configured' 
      });
    }

    // Prepare LINE message for group
    const lineMessage = {
      to: groupId,
      messages: [
        {
          type: 'text',
          text: message
        }
      ]
    };

    // If report data is provided, add it as additional message
    if (reportData) {
      lineMessage.messages.push({
        type: 'text',
        text: `📊 Export Report\n\n${reportData}`
      });
    }

    // Send message via LINE Messaging API
    const response = await axios.post(
      `${LINE_CONFIG.API_BASE_URL}/bot/message/push`,
      lineMessage,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    console.log('✅ LINE group notification sent successfully:', response.data);

    res.json({
      success: true,
      message: 'LINE group notification sent successfully',
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error sending LINE group notification:', error);
    
    if (error.response) {
      console.error('LINE API Error:', error.response.data);
      return res.status(500).json({
        success: false,
        error: 'Failed to send LINE group notification',
        details: error.response.data
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get LINE user profile
router.get('/user-profile/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;

    if (!lineId) {
      return res.status(400).json({ 
        success: false, 
        error: 'LINE ID is required' 
      });
    }

    if (!LINE_CONFIG.CHANNEL_ACCESS_TOKEN) {
      return res.status(500).json({ 
        success: false, 
        error: 'LINE Channel Access Token not configured' 
      });
    }

    // Get user profile from LINE API
    const response = await axios.get(
      `${LINE_CONFIG.API_BASE_URL}/bot/profile/${lineId}`,
      {
        headers: {
          'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error getting LINE user profile:', error);
    
    if (error.response) {
      console.error('LINE API Error:', error.response.data);
      return res.status(500).json({
        success: false,
        error: 'Failed to get LINE user profile',
        details: error.response.data
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
