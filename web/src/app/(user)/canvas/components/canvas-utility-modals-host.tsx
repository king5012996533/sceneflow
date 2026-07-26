"use client";

import { Button, Modal } from "antd";
import { AssetPickerModal } from "./asset-picker-modal";
import type { InsertAssetPayload } from "./asset-picker-modal";

type CanvasUtilityModalsHostProps = {
    clearConfirmOpen: boolean;
    onCloseClearConfirm: () => void;
    onConfirmClear: () => void;
    assetPickerOpen: boolean;
    onAssetInsert: (payload: InsertAssetPayload) => void;
    onCloseAssetPicker: () => void;
};

export function CanvasUtilityModalsHost(props: CanvasUtilityModalsHostProps) {
    const { clearConfirmOpen, onCloseClearConfirm, onConfirmClear, assetPickerOpen, onAssetInsert, onCloseAssetPicker } = props;

    return (
        <>
            <Modal
                title="清空画布？"
                open={clearConfirmOpen}
                centered
                onCancel={onCloseClearConfirm}
                footer={
                    <>
                        <Button onClick={onCloseClearConfirm}>取消</Button>
                        <Button danger type="primary" onClick={onConfirmClear}>
                            清空
                        </Button>
                    </>
                }
            >
                <p className="text-sm opacity-60">这会删除当前画布上的所有节点和连线。</p>
            </Modal>

            <AssetPickerModal open={assetPickerOpen} onInsert={onAssetInsert} onClose={onCloseAssetPicker} />
        </>
    );
}
