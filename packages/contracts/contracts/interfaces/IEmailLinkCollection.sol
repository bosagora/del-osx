// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

interface IEmailLinkCollection {
    function toAddress(bytes32 _email) external view returns (address);

    function toEmail(address _wallet) external view returns (bytes32);

    function nonceOf(address _wallet) external view returns (uint256);
}
