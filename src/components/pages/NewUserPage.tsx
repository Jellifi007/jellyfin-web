import React, { FunctionComponent, useCallback, useEffect, useState, useRef } from 'react';

import Dashboard from '../../utils/dashboard';
import globalize from '../../scripts/globalize';
import loading from '../loading/loading';
import toast from '../toast/toast';

import SectionTitleLinkElement from '../dashboard/users/SectionTitleLinkElement';
import InputElement from '../dashboard/users/InputElement';
import CheckBoxElement from '../dashboard/users/CheckBoxElement';
import CheckBoxListItem from '../dashboard/users/CheckBoxListItem';
import ButtonElement from '../dashboard/users/ButtonElement';

type userInput = {
    Name?: string;
    Password?: string;
}

type ItemsArr = {
    Name?: string;
    Id?: string;
}

const NewUserPage: FunctionComponent = () => {
    const [ channelsItems, setChannelsItems ] = useState<ItemsArr[]>([]);
    const [ mediaFoldersItems, setMediaFoldersItems ] = useState<ItemsArr[]>([]);
    const element = useRef<HTMLDivElement>(null);

    const getItemsResult = (items: ItemsArr[]) => {
        return items.map(item =>
            ({
                Id: item.Id,
                Name: item.Name
            })
        );
    };

    const loadMediaFolders = useCallback((result) => {
        const page = element.current;

        if (!page) {
            console.error('Unexpected null reference');
            return;
        }

        const mediaFolders = getItemsResult(result);

        setMediaFoldersItems(mediaFolders);

        const folderAccess = page.querySelector('.folderAccess') as HTMLDivElement;
        folderAccess.dispatchEvent(new CustomEvent('create'));

        (page.querySelector('.chkEnableAllFolders') as HTMLInputElement).checked = false;
    }, []);

    const loadChannels = useCallback((result) => {
        const page = element.current;

        if (!page) {
            console.error('Unexpected null reference');
            return;
        }

        const channels = getItemsResult(result);

        setChannelsItems(channels);

        const channelAccess = page.querySelector('.channelAccess') as HTMLDivElement;
        channelAccess.dispatchEvent(new CustomEvent('create'));

        const channelAccessContainer = page.querySelector('.channelAccessContainer') as HTMLDivElement;
        channels.length ? channelAccessContainer.classList.remove('hide') : channelAccessContainer.classList.add('hide');

        (page.querySelector('.chkEnableAllChannels') as HTMLInputElement).checked = false;
    }, []);

    const loadUser = useCallback(() => {
        const page = element.current;

        if (!page) {
            console.error('Unexpected null reference');
            return;
        }

        (page.querySelector('#txtUsername') as HTMLInputElement).value = '';
        (page.querySelector('#txtPassword') as HTMLInputElement).value = '';
        loading.show();
        const promiseFolders = window.ApiClient.getJSON(window.ApiClient.getUrl('Library/MediaFolders', {
            IsHidden: false
        }));
        const promiseChannels = window.ApiClient.getJSON(window.ApiClient.getUrl('Channels'));
        Promise.all([promiseFolders, promiseChannels]).then(function (responses) {
            loadMediaFolders(responses[0].Items);
            loadChannels(responses[1].Items);
            loading.hide();
        });
    }, [loadChannels, loadMediaFolders]);

    useEffect(() => {
        const page = element.current;

        if (!page) {
            console.error('Unexpected null reference');
            return;
        }

        loadUser();

        const saveUser = () => {
            const userInput: userInput = {};
            userInput.Name = (page.querySelector('#txtUsername') as HTMLInputElement).value;
            userInput.Password = (page.querySelector('#txtPassword') as HTMLInputElement).value;
            window.ApiClient.createUser(userInput).then(function (user) {
                if (!user.Id) {
                    throw new Error('Unexpected null user.Id');
                }

                if (!user.Policy) {
                    throw new Error('Unexpected null user.Policy');
                }

                user.Policy.EnableAllFolders = (page.querySelector('.chkEnableAllFolders') as HTMLInputElement).checked;
                user.Policy.EnabledFolders = [];

                if (!user.Policy.EnableAllFolders) {
                    user.Policy.EnabledFolders = Array.prototype.filter.call(page.querySelectorAll('.chkFolder'), function (i) {
                        return i.checked;
                    }).map(function (i) {
                        return i.getAttribute('data-id');
                    });
                }

                user.Policy.EnableAllChannels = (page.querySelector('.chkEnableAllChannels') as HTMLInputElement).checked;
                user.Policy.EnabledChannels = [];

                if (!user.Policy.EnableAllChannels) {
                    user.Policy.EnabledChannels = Array.prototype.filter.call(page.querySelectorAll('.chkChannel'), function (i) {
                        return i.checked;
                    }).map(function (i) {
                        return i.getAttribute('data-id');
                    });
                }

                window.ApiClient.updateUserPolicy(user.Id, user.Policy).then(function () {
                    Dashboard.navigate('useredit.html?userId=' + user.Id);
                });
            }, function () {
                toast(globalize.translate('ErrorDefault'));
                loading.hide();
            });
        };

        const onSubmit = (e: Event) => {
            loading.show();
            saveUser();
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        (page.querySelector('.chkEnableAllChannels') as HTMLInputElement).addEventListener('change', function (this: HTMLInputElement) {
            const channelAccessListContainer = page.querySelector('.channelAccessListContainer') as HTMLDivElement;
            this.checked ? channelAccessListContainer.classList.add('hide') : channelAccessListContainer.classList.remove('hide');
        });

        (page.querySelector('.chkEnableAllFolders') as HTMLInputElement).addEventListener('change', function (this: HTMLInputElement) {
            const folderAccessListContainer = page.querySelector('.folderAccessListContainer') as HTMLDivElement;
            this.checked ? folderAccessListContainer.classList.add('hide') : folderAccessListContainer.classList.remove('hide');
        });

        (page.querySelector('.newUserProfileForm') as HTMLFormElement).addEventListener('submit', onSubmit);

        (page.querySelector('.button-cancel') as HTMLButtonElement).addEventListener('click', function() {
            window.history.back();
        });
    }, [loadUser]);

    return (
        <div ref={element}>
            <div className='content-primary'>
                <div className='verticalSection'>
                    <div className='sectionTitleContainer flex align-items-center'>
                        <h2 className='sectionTitle'>
                            {globalize.translate('ButtonAddUser')}
                        </h2>
                        <SectionTitleLinkElement
                            className='raised button-alt headerHelpButton'
                            title='Help'
                            url='https://docs.jellyfin.org/general/server/users/'
                        />
                    </div>
                </div>
                <form className='newUserProfileForm'>
                    <div className='inputContainer'>
                        <InputElement
                            type='text'
                            id='txtUsername'
                            label='LabelName'
                            options={'required'}
                        />
                    </div>
                    <div className='inputContainer'>
                        <InputElement
                            type='password'
                            id='txtPassword'
                            label='LabelPassword'
                        />
                    </div>

                    <div className='folderAccessContainer'>
                        <h2>{globalize.translate('HeaderLibraryAccess')}</h2>
                        <CheckBoxElement
                            type='checkbox'
                            className='chkEnableAllFolders'
                            title='OptionEnableAccessToAllLibraries'
                        />
                        <div className='folderAccessListContainer'>
                            <div className='folderAccess'>
                                <h3 className='checkboxListLabel'>
                                    {globalize.translate('HeaderLibraries')}
                                </h3>
                                <div className='checkboxList paperList' style={{padding: '.5em 1em'}}>
                                    {mediaFoldersItems.map(Item => (
                                        <CheckBoxListItem
                                            key={Item.Id}
                                            className='chkFolder'
                                            Id={Item.Id}
                                            Name={Item.Name}
                                            checkedAttribute=''
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className='fieldDescription'>
                                {globalize.translate('LibraryAccessHelp')}
                            </div>
                        </div>
                    </div>
                    <div className='channelAccessContainer verticalSection-extrabottompadding hide'>
                        <h2>{globalize.translate('HeaderChannelAccess')}</h2>
                        <CheckBoxElement
                            type='checkbox'
                            className='chkEnableAllChannels'
                            title='OptionEnableAccessToAllChannels'
                        />
                        <div className='channelAccessListContainer'>
                            <div className='channelAccess'>
                                <h3 className='checkboxListLabel'>
                                    {globalize.translate('Channels')}
                                </h3>
                                <div className='checkboxList paperList' style={{padding: '.5em 1em'}}>
                                    {channelsItems.map(Item => (
                                        <CheckBoxListItem
                                            key={Item.Id}
                                            className='chkChannel'
                                            Id={Item.Id}
                                            Name={Item.Name}
                                            checkedAttribute=''
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className='fieldDescription'>
                                {globalize.translate('ChannelAccessHelp')}
                            </div>
                        </div>
                    </div>
                    <div>
                        <ButtonElement
                            type='submit'
                            className='raised button-submit block'
                            title='Save'
                        />
                        <ButtonElement
                            type='button'
                            className='raised button-cancel block btnCancel'
                            title='ButtonCancel'
                        />
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewUserPage;
