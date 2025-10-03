require('dotenv').config();
const axios = require('axios');

// Monday.com Service
class MondayService {
    constructor(apiToken, boardId) {
        this.apiToken = apiToken;
        this.boardId = boardId;
    }

    async createItem(itemName, columnValues = {}) {
        const query = `
            mutation CreateItem($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
                create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
                    id
                    name
                }
            }
        `;

        const variables = {
            boardId: parseInt(this.boardId),
            itemName: itemName,
            columnValues: JSON.stringify(columnValues)
        };

        try {
            const response = await axios.post('https://api.monday.com/v2', {
                query,
                variables
            }, {
                headers: {
                    'Authorization': this.apiToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Monday API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async getBoardColumns() {
        const query = `
            query GetBoard($boardId: ID!) {
                boards(ids: [$boardId]) {
                    columns {
                        id
                        title
                        type
                    }
                }
            }
        `;

        const variables = {
            boardId: parseInt(this.boardId)
        };

        try {
            const response = await axios.post('https://api.monday.com/v2', {
                query,
                variables
            }, {
                headers: {
                    'Authorization': this.apiToken,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.data.boards[0].columns;
        } catch (error) {
            console.error('Error fetching board columns:', error);
            return null;
        }
    }
}
module.exports = MondayService;
