import React, { createContext, useContext, useState, useRef } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ConfirmContext = createContext(null);

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm deve ser usado dentro de um ConfirmProvider');
    }
    return context;
}

export function ConfirmProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        description: '',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        type: 'confirm', // 'confirm' ou 'prompt'
        inputOptions: {
            type: 'text',
            placeholder: '',
            label: ''
        }
    });

    const [inputValue, setInputValue] = useState('');
    const resolver = useRef(null);

    const confirm = (options) => {
        return new Promise((resolve) => {
            setConfig({
                title: options.title || 'Atenção',
                description: options.description || '',
                confirmText: options.confirmText || 'Confirmar',
                cancelText: options.cancelText || 'Cancelar',
                type: options.type || 'confirm',
                inputOptions: {
                    type: options.inputOptions?.type || 'text',
                    placeholder: options.inputOptions?.placeholder || '',
                    label: options.inputOptions?.label || ''
                }
            });
            setInputValue(''); // Resetar
            setIsOpen(true);
            resolver.current = resolve;
        });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        if (config.type === 'prompt') {
            resolver.current(inputValue);
        } else {
            resolver.current(true);
        }
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (config.type === 'prompt') {
            resolver.current(null);
        } else {
            resolver.current(false);
        }
    };

    // Prevenir fechamento se for prompt e o input estiver vazio (opcional/pode ajustar depois)
    const isConfirmDisabled = config.type === 'prompt' && !inputValue.trim();

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}

            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{config.title}</AlertDialogTitle>
                        <AlertDialogDescription className={config.type === 'prompt' ? "mt-2 mb-4" : ""}>
                            {config.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {config.type === 'prompt' && (
                        <div className="grid w-full items-center gap-2 mb-4">
                            {config.inputOptions.label && (
                                <Label htmlFor="prompt-input">{config.inputOptions.label}</Label>
                            )}
                            <Input
                                id="prompt-input"
                                type={config.inputOptions.type}
                                placeholder={config.inputOptions.placeholder}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isConfirmDisabled) {
                                        handleConfirm();
                                    }
                                }}
                            />
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancel}>
                            {config.cancelText}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            disabled={isConfirmDisabled}
                            className={config.type === 'confirm' && config.confirmText.toLowerCase().includes('excluir') ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                        >
                            {config.confirmText}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
}
