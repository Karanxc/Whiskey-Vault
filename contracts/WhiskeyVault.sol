// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title WhiskeyVault
 * @dev Cryptographic Provenance & Cask Ownership Vault for Fine Whiskeys
 * Records immutable cask certificates, bottle serials, distillation logs, and ownership deeds.
 */
contract WhiskeyVault {
    struct WhiskeyRecord {
        string ipfsCid;
        string title;
        string description;
        uint256 size;
        uint256 timestamp;
        string author;
        string tags;
        string blockHash;
        string txHash;
    }

    WhiskeyRecord[] public records;

    event RecordUploaded(
        uint256 indexed id,
        string ipfsCid,
        string title,
        string author,
        uint256 timestamp,
        string blockHash,
        string txHash
    );

    // Backward-compatible event name for legacy web3 listeners
    event DocumentUploaded(
        uint256 indexed id,
        string ipfsCid,
        string title,
        string author,
        uint256 timestamp,
        string blockHash,
        string txHash
    );

    function uploadDocument(
        string memory ipfsCid,
        string memory title,
        string memory description,
        uint256 size,
        uint256 timestamp,
        string memory author,
        string memory tags,
        string memory blockHash,
        string memory txHash
    ) public returns (uint256) {
        records.push(WhiskeyRecord(
            ipfsCid, title, description, size, timestamp, author, tags, blockHash, txHash
        ));
        uint256 newId = records.length - 1;
        emit RecordUploaded(
            newId, ipfsCid, title, author, timestamp, blockHash, txHash
        );
        emit DocumentUploaded(
            newId, ipfsCid, title, author, timestamp, blockHash, txHash
        );
        return newId;
    }

    function getDocument(uint256 id) public view returns (
        string memory, string memory, string memory, uint256, uint256, string memory, string memory, string memory, string memory
    ) {
        require(id < records.length, "Invalid record ID");
        WhiskeyRecord memory doc = records[id];
        return (
            doc.ipfsCid, doc.title, doc.description, doc.size, doc.timestamp, doc.author, doc.tags, doc.blockHash, doc.txHash
        );
    }

    function getDocumentCount() public view returns (uint256) {
        return records.length;
    }
}

